import { useEffect, useState } from "react";
import api from "../../api/client";

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/analytics").then((res) => setData(res.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <>
      <h1>Analytics</h1>
      <p>Total complaints: {data.total_complaints}</p>
      <p>Resolution rate: {data.resolution_rate}%</p>
      <h2>By Category</h2>
      <BucketTable rows={data.complaints_by_category} />
      <h2>By Status</h2>
      <BucketTable rows={data.complaints_by_status} />
    </>
  );
}

function BucketTable({ rows }) {
  return (
    <table>
      <thead><tr><th>Name</th><th>Count</th></tr></thead>
      <tbody>
        {rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.count}</td></tr>)}
      </tbody>
    </table>
  );
}
