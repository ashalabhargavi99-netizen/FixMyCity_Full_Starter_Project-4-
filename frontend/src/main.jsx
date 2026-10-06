import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import "./style.css";

const API = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function App() {
  const [page, setPage] = useState("home");

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setPage("home");
  }

  return (
    <>
      <header>
        <b
          className="logo"
          onClick={() => setPage("home")}
        >
          📍 FixMyCity
        </b>

        <nav>
          <button onClick={() => setPage("home")}>
            Home
          </button>

          {user && (
            <>
              <button onClick={() => setPage("report")}>
                Report Issue
              </button>

              <button onClick={() => setPage("mine")}>
                My Complaints
              </button>
            </>
          )}

          {!user ? (
            <>
              <button onClick={() => setPage("login")}>
                Login
              </button>

              <button
                className="blue"
                onClick={() => setPage("register")}
              >
                Register
              </button>
            </>
          ) : (
            <button onClick={logout}>
              Logout
            </button>
          )}
        </nav>
      </header>

      <main>
        {page === "home" && (
          <Home
            go={setPage}
            user={user}
          />
        )}

        {page === "login" && (
          <Login
            setUser={setUser}
            go={setPage}
          />
        )}

        {page === "register" && (
          <Register go={setPage} />
        )}

        {page === "report" && user && (
          <Report go={setPage} />
        )}

        {page === "mine" && user && (
          <Mine />
        )}
      </main>

      <footer>
        FixMyCity • Report Today. Better City Tomorrow.
      </footer>
    </>
  );
}


function Home({ go, user }) {
  return (
    <section className="hero">
      <div>
        <small>AI-POWERED CIVIC PLATFORM</small>

        <h1>
          Report civic problems.
          <br />
          <em>Build a better city.</em>
        </h1>

        <p>
          Report potholes, garbage, water leakage,
          street-light and drainage issues.
          FixMyCity helps route complaints to the
          right department.
        </p>

        <button
          className="blue big"
          onClick={() => go(user ? "report" : "login")}
        >
          Report an Issue
        </button>
      </div>

      <div className="card">
        <h2>How it works</h2>

        <p>👤 Citizen</p>
        <p>🤖 AI Analysis</p>
        <p>🏛️ Department</p>
        <p>👨‍💼 Officer</p>
        <p>🔧 Resolution</p>
        <p>⭐ Citizen Feedback</p>
      </div>
    </section>
  );
}


function Login({ setUser, go }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", {
        email: email,
        password: password,
      });

      localStorage.setItem(
        "token",
        response.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      setUser(response.data.user);

      alert("Login successful!");

      go("home");

    } catch (error) {
      setMsg(
        error.response?.data?.detail ||
        "Login failed"
      );
    }
  }

  return (
    <div className="wrap">
      <form
        className="card form"
        onSubmit={submit}
      >
        <h2>Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
        />

        <button className="blue">
          Login
        </button>

        {msg && (
          <p className="error">
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}


function Register({ go }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();

    try {
      await api.post("/auth/register", {
        name: name,
        email: email,
        password: password,
      });

      alert(
        "Registration successful! Please login."
      );

      go("login");

    } catch (error) {
      setMsg(
        error.response?.data?.detail ||
        "Registration failed"
      );
    }
  }

  return (
    <div className="wrap">
      <form
        className="card form"
        onSubmit={submit}
      >
        <h2>Create Account</h2>

        <input
          placeholder="Full name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          minLength="6"
          required
        />

        <button className="blue">
          Register
        </button>

        {msg && (
          <p className="error">
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}


function Report({ go }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("title", title);
    formData.append(
      "description",
      description
    );

    if (image) {
      formData.append("image", image);
    }

    try {
      const response = await api.post(
        "/complaints",
        formData
      );

      alert(
        "Complaint Submitted Successfully!\n\n" +
        "Category: " +
        response.data.category +
        "\nPriority: " +
        response.data.priority +
        "\nDepartment: " +
        response.data.department
      );

      go("mine");

    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
        "Submission failed"
      );
    }
  }

  return (
    <div className="wrap wide">
      <form
        className="card form"
        onSubmit={submit}
      >
        <h2>Report an Issue</h2>

        <label>Issue Title</label>

        <input
          placeholder="Example: Water Leakage Near College"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          required
        />

        <label>Description</label>

        <textarea
          placeholder="Describe the problem..."
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
          required
        />

        <label>Photo</label>

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setImage(e.target.files[0])
          }
        />

        <button className="blue">
          Submit Complaint
        </button>

        {message && (
          <p className="error">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}


function Mine() {
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState("");

  async function loadComplaints() {
    try {
      const response = await api.get(
        "/complaints/my"
      );

      setComplaints(response.data);

    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
        "Unable to load complaints"
      );
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  return (
    <section className="page">
      <h2>My Complaints</h2>

      {message && (
        <p className="error">
          {message}
        </p>
      )}

      {complaints.length === 0 ? (
        <div className="card">
          No complaints yet.
        </div>
      ) : (
        complaints.map((complaint) => (
          <div
            className="card item"
            key={complaint.id}
          >
            <div>
              <h3>
                #{complaint.id} •{" "}
                {complaint.title}
              </h3>

              <p>
                {complaint.description}
              </p>

              <p>
                <b>Category:</b>{" "}
                {complaint.category}
              </p>

              <p>
                <b>Department:</b>{" "}
                {complaint.department}
              </p>

              <p>
                <b>Priority:</b>{" "}
                {complaint.priority}
              </p>

              <p>
                <b>Status:</b>{" "}
                {complaint.status}
              </p>
            </div>
          </div>
        ))
      )}
    </section>
  );
}


createRoot(
  document.getElementById("root")
).render(<App />);
