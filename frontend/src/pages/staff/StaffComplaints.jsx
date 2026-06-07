import { useEffect, useState } from "react";
import api from "../../api/client";
import { ComplaintTable } from "../student/MyComplaints.jsx";

export default function StaffComplaints() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    api.get("/complaints/assigned").then((res) => setComplaints(res.data));
  }, []);

  return (
    <>
      <h1>Assigned Complaints</h1>
      <ComplaintTable complaints={complaints} />
    </>
  );
}
