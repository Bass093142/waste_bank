"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TestDB() {
  const [wastes, setWastes] = useState([]);

  // ฟังก์ชัน Read: ดึงข้อมูลประเภทขยะ
  async function fetchWastes() {
    const { data, error } = await supabase.from("waste_types").select("*");
    if (error) console.error("Error fetching:", error);
    else setWastes(data);
  }

  // ดึงข้อมูลทันทีที่เปิดหน้าเว็บ
  useEffect(() => {
    fetchWastes();
  }, []);

  // ฟังก์ชัน Create: เพิ่มข้อมูลขยะทดสอบ
  async function addWaste() {
    const { error } = await supabase.from("waste_types").insert([
      { name: "ขยะทดสอบจาก Next.js", points_per_kg: 10, co2_factor: 0.5 }
    ]);
    if (!error) fetchWastes(); // ดึงข้อมูลใหม่มาแสดง
  }

  // ฟังก์ชัน Delete: ลบข้อมูลขยะล่าสุด
  async function deleteWaste(id) {
    const { error } = await supabase.from("waste_types").delete().eq("id", id);
    if (!error) fetchWastes(); // ดึงข้อมูลใหม่มาแสดง
  }

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold mb-4">🧪 ทดสอบเชื่อมต่อ Supabase</h1>
      
      <button 
        onClick={addWaste}
        className="bg-green-500 text-white px-4 py-2 rounded mb-6 hover:bg-green-600"
      >
        + เพิ่มขยะทดสอบ
      </button>

      <div className="grid gap-4">
        {wastes.map((waste) => (
          <div key={waste.id} className="border p-4 rounded flex justify-between items-center shadow-sm">
            <div>
              <p className="font-semibold text-lg">{waste.name}</p>
              <p className="text-gray-500">แต้ม/กก: {waste.points_per_kg} | ลดคาร์บอน: {waste.co2_factor}</p>
            </div>
            <button 
              onClick={() => deleteWaste(waste.id)}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              ลบ
            </button>
          </div>
        ))}
        {wastes.length === 0 && <p className="text-gray-400">ยังไม่มีข้อมูลขยะในระบบ</p>}
      </div>
    </div>
  );
}