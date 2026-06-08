import axios from "axios";

// ----------------------------------------------------------------------------
// LocalStorage-backed Live Mock DB for Smart School Grievance Portal
// ----------------------------------------------------------------------------

const getUsersFromStorage = () => {
  const data = localStorage.getItem("mock_users");
  if (!data) {
    const defaultUsers = [
      { id: 1, name: "Karthik", email: "student@school.com", role: "student", department: "Computer Science" },
      { id: 2, name: "Dean of Operations", email: "staff@school.com", role: "staff", department: "Infrastructure" },
      { id: 3, name: "Dean of Welfare", email: "welfare@school.com", role: "staff", department: "Welfare" },
      { id: 4, name: "Administrator", email: "admin@school.com", role: "admin", department: "Administration" }
    ];
    localStorage.setItem("mock_users", JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(data);
};

const getComplaintsFromStorage = () => {
  const data = localStorage.getItem("mock_complaints");
  if (!data) {
    const defaultComplaints = [
      {
        id: 81,
        title: "Lab Equipment Maintenance Needed",
        description: "Several high-performance computers in the Web Development Lab are failing to boot properly, causing delays in academic sessions.",
        category: "Facilities Management",
        priority: "Medium",
        status: "Resolved",
        is_anonymous: false,
        resolution_notes: "Hardware team checked motherboard rails and successfully booted all systems.",
        creator: { name: "Karthik", email: "student@school.com" },
        assignee: { name: "Dean of Operations", email: "staff@school.com" },
        created_at: "2024-10-12T10:45:00Z",
        updated_at: "2024-10-12T14:30:00Z"
      },
      {
        id: 92,
        title: "Bus Route #04 Constant Delay",
        description: "The transport bus serving Route #04 is consistently delayed by over 30 minutes, resulting in poor academic attendance support.",
        category: "Transport",
        priority: "Medium",
        status: "In Progress",
        is_anonymous: true,
        creator: { name: "Karthik", email: "student@school.com" },
        assignee: null,
        created_at: "2024-10-14T09:00:00Z",
        updated_at: "2024-10-14T09:00:00Z"
      },
      {
        id: 89,
        title: "Hostel Maintenance Issue",
        description: "There is a persistent water leakage problem in the West Wing hostel, specifically in Room 402 and the adjacent corridor. The issue started approximately 5 days ago and has since worsened. Water is seeping through the ceiling panels, creating a slippery floor hazard and causing mold growth. We have reported this to the local hostel caretaker twice, but no substantive action has been taken other than placing buckets. The leakage is located near electrical fittings, which poses a severe safety risk to the residents.",
        category: "Facilities Management",
        priority: "High",
        status: "Action Required",
        is_anonymous: false,
        creator: { name: "Karthik", email: "student@school.com" },
        assignee: { name: "Dean of Welfare", email: "welfare@school.com" },
        created_at: "2024-10-12T10:45:00Z",
        updated_at: "2024-10-14T14:15:00Z"
      }
    ];
    localStorage.setItem("mock_complaints", JSON.stringify(defaultComplaints));
    return defaultComplaints;
  }
  return JSON.parse(data);
};

const getFeedbacksFromStorage = () => {
  const data = localStorage.getItem("mock_feedbacks");
  if (!data) {
    const defaultFeedbacks = [
      {
        complaint_id: 81,
        rating: 5,
        comment: "Thank you for the super fast inspection and fix! The lab sessions are back on track now."
      }
    ];
    localStorage.setItem("mock_feedbacks", JSON.stringify(defaultFeedbacks));
    return defaultFeedbacks;
  }
  return JSON.parse(data);
};

// Sync helpers
const saveUsers = (users) => localStorage.setItem("mock_users", JSON.stringify(users));
const saveComplaints = (complaints) => localStorage.setItem("mock_complaints", JSON.stringify(complaints));
const saveFeedbacks = (feedbacks) => localStorage.setItem("mock_feedbacks", JSON.stringify(feedbacks));

const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      // fallback
    }
  }
  const defaultUser = getUsersFromStorage()[0]; // Default to student Karthik
  localStorage.setItem("user", JSON.stringify(defaultUser));
  localStorage.setItem("token", "mock-token-session");
  return defaultUser;
};

// Create the Axios Client
const BASE_URL = "/api-mock-bypass";
const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ----------------------------------------------------------------------------
// INTERCEPT & ROUTE API GET CALLS
// ----------------------------------------------------------------------------
api.get = function (url, config) {
  console.log("[Mock API GET]", url);
  const users = getUsersFromStorage();
  const complaints = getComplaintsFromStorage();
  const feedbacks = getFeedbacksFromStorage();
  const currentUser = getCurrentUser();

  // GET /auth/me
  if (url === "/auth/me") {
    return Promise.resolve({ data: currentUser });
  }

  // GET /complaints/mine
  if (url === "/complaints/mine") {
    const filtered = complaints.filter(
      (c) => c.creator && c.creator.email === currentUser.email
    );
    return Promise.resolve({ data: filtered });
  }

  // GET /complaints/assigned
  if (url === "/complaints/assigned") {
    const filtered = complaints.filter(
      (c) => c.assignee && c.assignee.email === currentUser.email
    );
    return Promise.resolve({ data: filtered });
  }

  // GET /complaints
  if (url === "/complaints" || url === "complaints") {
    return Promise.resolve({ data: complaints });
  }

  // GET /users
  if (url === "/users" || url === "users") {
    return Promise.resolve({ data: users });
  }

  // GET /analytics
  if (url === "/analytics") {
    const total = complaints.length;
    const resolved = complaints.filter((c) => c.status === "Resolved").length;
    const inProgress = complaints.filter(
      (c) =>
        c.status === "In Progress" ||
        c.status === "Under Review" ||
        c.status === "Action Required"
    ).length;
    const open = complaints.filter(
      (c) => c.status === "Submitted" || !c.status
    ).length;

    // Categories tallies
    const categories = {};
    complaints.forEach((c) => {
      const cat = c.category || "General";
      categories[cat] = (categories[cat] || 0) + 1;
    });

    // Custom status breakdown lists for charts
    const statuses = {
      Submitted: complaints.filter((c) => c.status === "Submitted").length,
      "Under Review": complaints.filter((c) => c.status === "Under Review").length,
      "In Progress": complaints.filter((c) => c.status === "In Progress").length,
      "Action Required": complaints.filter((c) => c.status === "Action Required").length,
      Resolved: complaints.filter((c) => c.status === "Resolved").length,
      Rejected: complaints.filter((c) => c.status === "Rejected").length,
    };

    return Promise.resolve({
      data: {
        total,
        resolved,
        in_progress: inProgress,
        open,
        categories,
        statuses,
      },
    });
  }

  // GET /feedback/:id
  const feedbackMatch = url.match(/^\/feedback\/(\d+)$/);
  if (feedbackMatch) {
    const cid = parseInt(feedbackMatch[1], 10);
    const found = feedbacks.find((f) => f.complaint_id === cid);
    if (found) {
      return Promise.resolve({ data: found });
    }
    return Promise.reject({
      response: { status: 404, data: { detail: "No feedback found" } },
    });
  }

  // GET /complaints/:id
  const idMatch = url.match(/^\/complaints\/(\d+)$/);
  if (idMatch) {
    const cid = parseInt(idMatch[1], 10);
    const found = complaints.find((c) => c.id === cid);
    if (found) {
      return Promise.resolve({ data: found });
    }
    return Promise.reject({
      response: { status: 404, data: { detail: `Grievance #${cid} not found` } },
    });
  }

  // Default fallback to prevent crash
  return Promise.reject({
    response: { status: 404, data: { detail: "Not Found Mock Route" } },
  });
};

// ----------------------------------------------------------------------------
// INTERCEPT & ROUTE API POST CALLS
// ----------------------------------------------------------------------------
api.post = function (url, data, config) {
  console.log("[Mock API POST]", url, data);
  const users = getUsersFromStorage();
  const complaints = getComplaintsFromStorage();
  const feedbacks = getFeedbacksFromStorage();
  const currentUser = getCurrentUser();

  // POST /auth/login
  if (url === "/auth/login") {
    const matched = users.find(
      (u) => u.email.toLowerCase() === (data.email || "").toLowerCase()
    );
    if (matched) {
      localStorage.setItem("user", JSON.stringify(matched));
      localStorage.setItem("token", "mock-token-session-" + matched.id);
      return Promise.resolve({
        data: {
          access_token: "mock-token-session-" + matched.id,
          user: matched,
        },
      });
    }
    return Promise.reject({
      response: { data: { detail: "Invalid email and password combination." } },
    });
  }

  // POST /auth/register
  if (url === "/auth/register") {
    const emailLower = (data.email || "").toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailLower)) {
      return Promise.reject({
        response: { data: { detail: "Email already registered." } },
      });
    }
    const newUser = {
      id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
      name: data.name || "New User",
      email: data.email,
      role: data.role || "student",
      department: data.department || null,
    };
    users.push(newUser);
    saveUsers(users);

    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("token", "mock-token-session-" + newUser.id);

    return Promise.resolve({
      data: {
        access_token: "mock-token-session-" + newUser.id,
        user: newUser,
      },
    });
  }

  // POST /complaints
  if (url === "/complaints" || url === "complaints") {
    const newComp = {
      id: complaints.length ? Math.max(...complaints.map((c) => c.id)) + 1 : 101,
      title: data.title || "Untitled Issue",
      description: data.description || "",
      category: data.category || "General",
      priority: data.priority || "Medium",
      status: "Submitted",
      is_anonymous: !!data.is_anonymous,
      creator: {
        name: currentUser.name || "Student",
        email: currentUser.email || "student@school.com",
      },
      assignee: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolution_notes: "",
    };
    complaints.push(newComp);
    saveComplaints(complaints);
    return Promise.resolve({ data: newComp });
  }

  // POST /users
  if (url === "/users" || url === "users") {
    const emailLower = (data.email || "").toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === emailLower)) {
      return Promise.reject({
        response: { data: { detail: "User with this email already exists." } },
      });
    }
    const newUser = {
      id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
      name: data.name || "Default Account",
      email: data.email,
      role: data.role || "staff",
      department: data.department || null,
      password: data.password || "password123",
    };
    users.push(newUser);
    saveUsers(users);
    return Promise.resolve({ data: newUser });
  }

  // POST /feedback
  if (url === "/feedback") {
    const cid = parseInt(data.complaint_id, 10);
    const newFeedback = {
      complaint_id: cid,
      rating: parseInt(data.rating, 10) || 5,
      comment: data.comment || "",
    };
    feedbacks.push(newFeedback);
    saveFeedbacks(feedbacks);

    // Auto set complaint to Resolved if matching
    const idx = complaints.findIndex((c) => c.id === cid);
    if (idx !== -1) {
      complaints[idx].status = "Resolved";
      complaints[idx].updated_at = new Date().toISOString();
      saveComplaints(complaints);
    }
    return Promise.resolve({ data: newFeedback });
  }

  return Promise.reject({
    response: { status: 404, data: { detail: "Not Found Mock Route" } },
  });
};

// ----------------------------------------------------------------------------
// INTERCEPT & ROUTE API PATCH CALLS
// ----------------------------------------------------------------------------
api.patch = function (url, data, config) {
  console.log("[Mock API PATCH]", url, data);
  const users = getUsersFromStorage();
  const complaints = getComplaintsFromStorage();

  // PATCH /complaints/:id/status
  const statusMatch = url.match(/^\/complaints\/(\d+)\/status$/);
  if (statusMatch) {
    const cid = parseInt(statusMatch[1], 10);
    const idx = complaints.findIndex((c) => c.id === cid);
    if (idx !== -1) {
      complaints[idx].status = data.status || complaints[idx].status;
      complaints[idx].resolution_notes =
        data.resolution_notes !== undefined
          ? data.resolution_notes
          : complaints[idx].resolution_notes;
      complaints[idx].updated_at = new Date().toISOString();
      saveComplaints(complaints);
      return Promise.resolve({ data: complaints[idx] });
    }
    return Promise.reject({
      response: { status: 404, data: { detail: "Complaint not found" } },
    });
  }

  // PATCH /complaints/:id/assign
  const assignMatch = url.match(/^\/complaints\/(\d+)\/assign$/);
  if (assignMatch) {
    const cid = parseInt(assignMatch[1], 10);
    const idx = complaints.findIndex((c) => c.id === cid);
    if (idx !== -1) {
      const staffVal = data.staff_id;
      const staffObj = staffVal ? users.find((u) => u.id === staffVal) : null;
      complaints[idx].assignee = staffObj
        ? { name: staffObj.name, email: staffObj.email }
        : null;
      complaints[idx].updated_at = new Date().toISOString();
      saveComplaints(complaints);
      return Promise.resolve({ data: complaints[idx] });
    }
    return Promise.reject({
      response: { status: 404, data: { detail: "Complaint not found" } },
    });
  }

  // PATCH /complaints/:id
  const idMatch = url.match(/^\/complaints\/(\d+)$/);
  if (idMatch) {
    const cid = parseInt(idMatch[1], 10);
    const idx = complaints.findIndex((c) => c.id === cid);
    if (idx !== -1) {
      complaints[idx] = {
        ...complaints[idx],
        ...data,
        updated_at: new Date().toISOString(),
      };
      saveComplaints(complaints);
      return Promise.resolve({ data: complaints[idx] });
    }
    return Promise.reject({
      response: { status: 404, data: { detail: "Complaint not found" } },
    });
  }

  // PATCH /users/:id
  const userMatch = url.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    const uid = parseInt(userMatch[1], 10);
    const idx = users.findIndex((u) => u.id === uid);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        ...data,
      };
      saveUsers(users);

      // If active user updated, keep active profile synced
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.id === uid) {
        localStorage.setItem("user", JSON.stringify(users[idx]));
      }

      return Promise.resolve({ data: users[idx] });
    }
    return Promise.reject({
      response: { status: 404, data: { detail: "User not found" } },
    });
  }

  return Promise.reject({
    response: { status: 404, data: { detail: "Not Found Mock Route" } },
  });
};

// ----------------------------------------------------------------------------
// INTERCEPT & ROUTE API DELETE CALLS
// ----------------------------------------------------------------------------
api.delete = function (url, config) {
  console.log("[Mock API DELETE]", url);
  const users = getUsersFromStorage();

  // DELETE /users/:id
  const userMatch = url.match(/^\/users\/(\d+)$/);
  if (userMatch) {
    const uid = parseInt(userMatch[1], 10);
    const initialLen = users.length;
    const filtered = users.filter((u) => u.id !== uid);
    if (filtered.length < initialLen) {
      saveUsers(filtered);
      return Promise.resolve({ data: { message: "User deleted successfully" } });
    }
    return Promise.reject({
      response: { status: 404, data: { detail: "User not found" } },
    });
  }

  return Promise.reject({
    response: { status: 404, data: { detail: "Not Found Mock Route" } },
  });
};

export default api;
