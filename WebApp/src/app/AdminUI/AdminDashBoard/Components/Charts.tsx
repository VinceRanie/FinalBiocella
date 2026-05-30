


import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  }from "recharts";

  
  const data = [
    { name: "Ethanol", stock: 85 },
    { name: "HCl", stock: 42 },
    { name: "NaOH", stock: 67 },
    { name: "Methanol", stock: 23 },
    { name: "Acetone", stock: 91 },
    { name: "H₂SO₄", stock: 35 },
  ];

export default function Charts(){

    return(
        <>
           <div className="lg:col-span-2 rounded-2xl border border-dashed border-gray-300 text-gray-400">
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Inventory Status
      </h3>

      <div className="w-full h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
  <BarChart data={data} barSize={28}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

    <XAxis 
      dataKey="name" 
      fontSize={11} 
      tickLine={false} 
      axisLine={false}
    />
    
    <YAxis 
      fontSize={11} 
      tickLine={false} 
      axisLine={false}
    />

    <Tooltip
      contentStyle={{
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
        fontSize: "12px",
      }}
      cursor={{ fill: "rgba(0,0,0,0.03)" }}
    />

    <Bar
      dataKey="stock"
      fill="#113F67"
      radius={[6, 6, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
      </div>
    </div>
        </div>
        </>
    );

}