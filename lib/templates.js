import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yklhwtudxqitnsgsbmky.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbGh3dHVkeHFpdG5zZ3NibWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MjgwNDYsImV4cCI6MjA3MDIwNDA0Nn0.LILfWgfJDoQK2IdXyKc1oEEOGun4otJ8lPpkcr7EuS8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/* -------------------------
   Helpers
   ------------------------- */

/**
 * Get the currently authenticated user (cached for the lifetime of the call).
 */
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.error('supabase.auth.getUser error:', error)
    return null
  }
  return data?.user ?? null
}

/**
 * Convert base64 data URL to File object (browser environment)
 * filename should be a single segment (no slashes)
 */
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

/**
 * sanitize a filename base (remove unsafe chars)
 */
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\-\.]/gi, '-')
}

/* -------------------------
   Storage helpers
   ------------------------- */

/**
 * Upload image to Supabase Storage
 *
 * Returns: { publicUrl: string|null, path: string|null } or null on failure
 *
 * - base64Image: data URL like "data:image/png;base64,...."
 * - type: 'header' | 'footer' | other label
 * - userId: owner folder segment
 * - bucketName: optional (default 'quote-template-images')
 */
export async function uploadTemplateImage(
  base64Image,
  type,
  userId,
  bucketName = 'quote-template-images'
) {
  if (!base64Image || !base64Image.startsWith('data:image')) {
    return null
  }

  try {
    const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/png'
    const ext = mime.split('/')[1] || 'png'

    const timestamp = Date.now()
    const base = sanitizeFilename(`${type}-${timestamp}`)
    const filename = `${base}.${ext}`

    // Use 'anonymous' folder if no userId
    const folder = userId || 'anonymous'
    const path = `${folder}/${filename}` // path inside bucket

    const file = dataURLtoFile(base64Image, filename)

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error(`Upload error for ${type}:`, uploadError)
      alert(`❌ Image upload failed (${type}): ` + uploadError.message)
      throw uploadError
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path)

    const publicUrl = publicData?.publicUrl ?? null
    return { publicUrl, path }
  } catch (error) {
    console.error('Error uploading image:', error)
    return null
  }
}

/**
 * Delete image from Supabase Storage
 *
 * Accepts either:
 * - storage path (e.g. "userId/header-123.png") OR
 * - publicUrl (e.g. https://.../storage/v1/object/public/bucket/userId/header-123.png)
 *
 * Returns boolean success.
 */
export async function deleteTemplateImage(imageIdentifier, bucketName = 'quote-template-images') {
  if (!imageIdentifier) return true

  try {
    // If looks like a public URL from Supabase storage, parse path after bucket
    let path = imageIdentifier

    try {
      const url = new URL(imageIdentifier)
      // common Supabase public URL shape ends with '/bucketName/<path>'
      const idx = url.pathname.indexOf(`/${bucketName}/`)
      if (idx !== -1) {
        path = url.pathname.slice(idx + (`/${bucketName}/`).length)
      } else {
        // If not found, fallback: attempt to find '/object/public/{bucketName}/' segment
        const altIdx = url.pathname.indexOf(`/object/public/${bucketName}/`)
        if (altIdx !== -1) {
          path = url.pathname.slice(altIdx + (`/object/public/${bucketName}/`).length)
        } else {
          // not a supabase public url - assume caller passed the path already
          path = imageIdentifier
        }
      }
    } catch (e) {
      // not a url; assume its a path already
      path = imageIdentifier
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting image:', error)
    return false
  }
}

/* -------------------------
   Template CRUD (DB)
   ------------------------- */

/**
 * Save template to Supabase
 *
 * Writes both image URL and image path to DB: header_image_url, header_image_path, footer_image_url, footer_image_path
 * Make sure your table has *_path columns (text) to store these.
 */
export async function saveTemplate(templateData, templateName = 'Untitled Template') {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null // Allow null for anonymous

    // try to find base64 header/footer either at top-level or inside template_data
    const topHeader = templateData?.headerImage
    const nestedHeader = templateData?.template_data?.headerImage
    const headerBase64 = topHeader || nestedHeader || null

    const topFooter = templateData?.footerImage
    const nestedFooter = templateData?.template_data?.footerImage
    const footerBase64 = topFooter || nestedFooter || null

    let headerImageUrl = null
    let headerImagePath = null
    if (headerBase64 && typeof headerBase64 === 'string') {
      if (headerBase64.startsWith('data:image')) {
        const res = await uploadTemplateImage(headerBase64, 'header', userId)
        headerImageUrl = res?.publicUrl ?? null
        headerImagePath = res?.path ?? null
      } else {
        // It's already a URL
        headerImageUrl = headerBase64
      }
    }

    let footerImageUrl = null
    let footerImagePath = null
    if (footerBase64 && typeof footerBase64 === 'string') {
      if (footerBase64.startsWith('data:image')) {
        const res = await uploadTemplateImage(footerBase64, 'footer', userId)
        footerImageUrl = res?.publicUrl ?? null
        footerImagePath = res?.path ?? null
      } else {
        // It's already a URL
        footerImageUrl = footerBase64
        // Path is unknown here for a new save, but URL is preserved
      }
    }

    // Replace base64 with URL in template_data to save space and keep it clean
    const finalTemplateData = {
      ...templateData,
      headerImage: headerImageUrl || templateData.headerImage,
      footerImage: footerImageUrl || templateData.footerImage
    }

    // Keep the whole templateData so we don't drop headerImage/footerImage accidentally
    const { data, error } = await supabase
      .from('quote_templates')
      .insert({
        user_id: userId,
        name: templateName,
        header_image_url: headerImageUrl,
        header_image_path: headerImagePath,
        footer_image_url: footerImageUrl,
        footer_image_path: footerImagePath,
        template_data: finalTemplateData
      })
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      alert('❌ Save failed: ' + error.message)
      throw error
    }

    alert('✅ Template saved successfully!')
    return data
  } catch (error) {
    console.error('Error saving template:', error)
    alert('❌ Save failed: ' + error.message)
    return null
  }
}

/**
 * Update existing template
 *
 * If base64 image fields are provided, treat as new upload. Deletion is left to explicit user action.
 */
export async function updateTemplate(templateId, templateData, templateName) {
  try {
    if (!templateId) {
      console.warn('updateTemplate called without templateId')
      return null
    }

    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // fetch existing to know existing paths (if any)
    const { data: existing, error: fetchErr } = await supabase
      .from('quote_templates')
      .select('header_image_url, header_image_path, footer_image_url, footer_image_path')
      .eq('id', templateId)
      .single()

    if (fetchErr) {
      console.warn('updateTemplate: could not fetch existing template', fetchErr)
    }

    let headerImageUrl = existing?.header_image_url ?? null
    let headerImagePath = existing?.header_image_path ?? null
    let footerImageUrl = existing?.footer_image_url ?? null
    let footerImagePath = existing?.footer_image_path ?? null

    // find base64 if provided either top-level or nested
    const topHeader = templateData?.headerImage
    const nestedHeader = templateData?.template_data?.headerImage
    const headerBase64 = topHeader || nestedHeader || null

    const topFooter = templateData?.footerImage
    const nestedFooter = templateData?.template_data?.footerImage
    const footerBase64 = topFooter || nestedFooter || null

    if (headerBase64 && typeof headerBase64 === 'string' && headerBase64.startsWith('data:image')) {
      // delete previous file if we have a stored path or url
      try {
        if (headerImagePath) await deleteTemplateImage(headerImagePath)
        else if (headerImageUrl) await deleteTemplateImage(headerImageUrl)
      } catch (e) {
        console.warn('updateTemplate: warning deleting previous header image', e)
      }

      const res = await uploadTemplateImage(headerBase64, 'header', userId)
      headerImageUrl = res?.publicUrl ?? null
      headerImagePath = res?.path ?? null
    } else if (headerBase64 === "") {
      // User explicitly removed the image
      try {
        if (headerImagePath) await deleteTemplateImage(headerImagePath)
        else if (headerImageUrl) await deleteTemplateImage(headerImageUrl)
      } catch (e) {}
      headerImageUrl = null
      headerImagePath = null
    }

    if (footerBase64 && typeof footerBase64 === 'string' && footerBase64.startsWith('data:image')) {
      try {
        if (footerImagePath) await deleteTemplateImage(footerImagePath)
        else if (footerImageUrl) await deleteTemplateImage(footerImageUrl)
      } catch (e) {
        console.warn('updateTemplate: warning deleting previous footer image', e)
      }

      const res = await uploadTemplateImage(footerBase64, 'footer', userId)
      footerImageUrl = res?.publicUrl ?? null
      footerImagePath = res?.path ?? null
    } else if (footerBase64 === "") {
      // User explicitly removed the image
      try {
        if (footerImagePath) await deleteTemplateImage(footerImagePath)
        else if (footerImageUrl) await deleteTemplateImage(footerImageUrl)
      } catch (e) {}
      footerImageUrl = null
      footerImagePath = null
    }

    const finalTemplateData = {
      ...templateData,
      headerImage: headerImageUrl || (headerBase64 === "" ? "" : templateData.headerImage),
      footerImage: footerImageUrl || (footerBase64 === "" ? "" : templateData.footerImage)
    }

    // write both url and path back to DB and preserve the template_data object
    const { data, error } = await supabase
      .from('quote_templates')
      .update({
        name: templateName,
        header_image_url: headerImageUrl,
        header_image_path: headerImagePath,
        footer_image_url: footerImageUrl,
        footer_image_path: footerImagePath,
        template_data: finalTemplateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Database update error:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error updating template:', error)
    alert('❌ Update failed: ' + error.message)
    return null
  }
}

/* -------------------------
   Read/Delete helpers
   ------------------------- */
export async function getTemplates() {
  try {
    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return []
    }

    const bucket = 'quote-template-images'

    // Post-process to create signed urls for private buckets if _path exists
    const processed = await Promise.all((data || []).map(async (t) => {
      const copy = { ...t }

      if (t.header_image_path) {
        try {
          const { data: signed, error: sErr } = await supabase.storage
            .from(bucket)
            .createSignedUrl(t.header_image_path, 60 * 60) // 1 hour
          if (!sErr && signed?.signedUrl) copy.header_image_url = signed.signedUrl
        } catch (e) {
          console.warn('Failed to create signed URL for header', e)
        }
      }

      if (t.footer_image_path) {
        try {
          const { data: signed, error: sErr } = await supabase.storage
            .from(bucket)
            .createSignedUrl(t.footer_image_path, 60 * 60)
          if (!sErr && signed?.signedUrl) copy.footer_image_url = signed.signedUrl
        } catch (e) {
          console.warn('Failed to create signed URL for footer', e)
        }
      }

      return copy
    }))

    return processed || []
  } catch (error) {
    console.error('Error getting templates:', error)
    return []
  }
}

// Robust getTemplate
export async function getTemplate(templateId) {
  try {
    if (!templateId) {
      console.warn('getTemplate called with empty templateId')
      return null
    }

    const { data, error, status } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    // Log both data & error for better visibility
    if (error) {
      console.error('getTemplate: supabase returned an error', { templateId, status, error, data })
      // return null rather than throwing to allow graceful handling
      return null
    }

    if (!data) {
      console.warn('getTemplate: no data returned for id', templateId)
      return null
    }

    return data
  } catch (err) {
    console.error('getTemplate: unexpected error', { templateId, err })
    return null
  }
}

// Robust deleteTemplate
export async function deleteTemplate(templateId) {
  try {
    if (!templateId) {
      console.warn('deleteTemplate called with empty templateId')
      return false
    }

    const template = await getTemplate(templateId)

    if (!template) {
      console.warn('deleteTemplate: template not found or fetch failed for id', templateId)
      return false
    }

    // Try deleting images if we have either stored path or url
    try {
      if (template.header_image_path) {
        await deleteTemplateImage(template.header_image_path)
      } else if (template.header_image_url) {
        await deleteTemplateImage(template.header_image_url)
      }
    } catch (imgErr) {
      console.warn('deleteTemplate: header image deletion failed', { templateId, imgErr })
      // continue with DB delete even if image deletion failed
    }

    try {
      if (template.footer_image_path) {
        await deleteTemplateImage(template.footer_image_path)
      } else if (template.footer_image_url) {
        await deleteTemplateImage(template.footer_image_url)
      }
    } catch (imgErr) {
      console.warn('deleteTemplate: footer image deletion failed', { templateId, imgErr })
      // continue
    }

    const { error } = await supabase
      .from('quote_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      console.error('deleteTemplate: failed to delete DB row', { templateId, error })
      return false
    }

    return true
  } catch (err) {
    console.error('deleteTemplate: unexpected error', { templateId, err })
    return false
  }
}

/**
 * Convert template from database for editing (backwards-compatible)
 */
export function prepareTemplateForEditing(template) {
  return {
    ...template.template_data,
    headerImage: template.header_image_url || template.template_data?.headerImage || '',
    footerImage: template.footer_image_url || template.template_data?.footerImage || ''
  }
}
