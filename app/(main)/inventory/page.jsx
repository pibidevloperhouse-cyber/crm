"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Loader2, PackageSearch, Box } from "lucide-react";
import { redirect } from "next/navigation";

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("name-asc");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  // Initialize session from localStorage
  useEffect(() => {
    const getSession = () => {
      const sessionJSON = JSON.parse(localStorage.getItem("session"));
      setSession(sessionJSON);
      setUserEmail(sessionJSON.user.email);
    };
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      redirect("/");
    }

    getSession();
  }, []);

  // Fetch products for the logged-in user
  const fetchProducts = async () => {
    if (!userEmail) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_email", userEmail);

    if (!error) {
      setProducts(data);
      setFiltered(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userEmail) {
      fetchProducts();
    }
  }, [userEmail]);

  // Apply search & filters
  useEffect(() => {
    let p = [...products];

    // search
    if (search.trim() !== "") {
      p = p.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.category?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // category filter
    if (category !== "all") {
      p = p.filter((item) => item.category === category);
    }

    // sorting
    const sortFunctions = {
      "name-asc": (a, b) => a.name.localeCompare(b.name),
      "name-desc": (a, b) => b.name.localeCompare(a.name),
      "price-asc": (a, b) => Number(a.base_price) - Number(b.base_price),
      "price-desc": (a, b) => Number(b.base_price) - Number(a.base_price),
      "stock-asc": (a, b) => a.stock - b.stock,
      "stock-desc": (a, b) => b.stock - a.stock,
    };

    p.sort(sortFunctions[sort]);

    setFiltered(p);
  }, [search, category, sort, products]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
      </div>

      {/* Search & Filters */}
      <div className="bg-white/60 backdrop-blur-xl shadow-md border rounded-xl p-5 flex items-center gap-4 flex-wrap">
        <div className="w-full md:w-1/3">
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11"
          />
        </div>

        <Select onValueChange={setCategory} defaultValue="all">
          <SelectTrigger className="w-48 h-11">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>

            {[...new Set(products.map((p) => p.category))].map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={setSort} defaultValue="name-asc">
          <SelectTrigger className="w-48 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A → Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z → A)</SelectItem>
            <SelectItem value="price-asc">Price (Low → High)</SelectItem>
            <SelectItem value="price-desc">Price (High → Low)</SelectItem>
            <SelectItem value="stock-asc">Stock (Low → High)</SelectItem>
            <SelectItem value="stock-desc">Stock (High → Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border shadow-lg overflow-hidden bg-white">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 shadow-sm">
            <TableRow>
              <TableHead className="text-left">Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan="5" className="py-10 text-center">
                  <Loader2 className="size-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length > 0 ? (
              filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50 transition-all"
                >
                  <TableCell className="font-medium flex items-center gap-3 mt-5 mb-5">
                    <Box className="size-5 text-gray-500" />
                    {item.name}
                  </TableCell>

                  <TableCell>{item.category}</TableCell>
                  <TableCell className="font-semibold">
                    ₹{Number(item.base_price).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>{item.stock}</TableCell>

                  <TableCell>
                    {item.stock == 0 ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : item.stock < 10 ? (
                      <Badge className="bg-orange-500 hover:bg-orange-600">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge className="bg-green-600 hover:bg-green-700">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan="5"
                  className="py-12 text-center opacity-70 space-y-2"
                >
                  <PackageSearch className="size-10 mx-auto opacity-50" />
                  <p>No products found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
