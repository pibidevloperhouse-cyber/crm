import { NextResponse } from "next/server";

const API = "https://crmemail.onrender.com";

export async function POST(req) {
  try {
    const body = await req.json();

    const res = await fetch(`${API}/icp/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Render error ${res.status}`);

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import { createClient } from "@/utils/supabase/server";

// export async function POST(request) {
//   const formData = await request.json();
//   const supabase = await createClient();

//   const { data: user_1 } = await supabase
//     .from("ICP")
//     .select("user_email")
//     .eq("user_email", formData.user_email)
//     .single();
//   console.log(user_1);

//   if (!user_1) {
//     try {
//       console.log(formData.description);
//       const response = await fetch("http://127.0.0.1:5000/chat", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(formData.description),
//       });
//       if (response.status === 200) {
//         const responseData = await response.json();
//         const high = responseData.response.high_prospect_group;
//         const medium = responseData.response.medium_prospect_group;
//         const low = responseData.response.low_prospect_group;
//         const { data: user, error } = await supabase
//           .from("ICP")
//           .insert({
//             icp: responseData.response.ICP,
//             high: high,
//             medium: medium,
//             low: low,
//             user_email: formData.user_email,
//           })
//           .select();
//         if (error) {
//           return NextResponse.json({
//             message: "User creation failed",
//             status: 400,
//           });
//         } else {
//           return NextResponse.json({
//             message: "User created successfully",
//             status: 200,
//           });
//         }
//       } else {
//         return NextResponse.json(
//           { error: "Failed to fetch ICP data" },
//           { status: response.status },
//         );
//       }
//     } catch (error) {
//       console.log(error);
//       return NextResponse.json(
//         { error: "Internal Server Error" },
//         { status: 400 },
//       );
//     }
//   } else {
//     return NextResponse.json({ error: "User already exists" }, { status: 401 });
//   }
// }
