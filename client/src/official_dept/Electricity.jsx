import React, { useState, useEffect } from "react";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";

const ElectricityDashboard = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("assigned");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sample data for electricity grievances
  const [grievances, setGrievances] = useState({
    unassigned: [
      { id: "E16835", title: "Frequent Power Outage Complaint", date: "26.02.25", category: "Supply", subcategory: "Outage", assignee: "" },
      { id: "E16801", title: "High Voltage Fluctuation Issue", date: "25.02.25", category: "Quality", subcategory: "Voltage", assignee: "" },
    ],
    assigned: [
      { id: "E16817", title: "Meter Reading Discrepancy", date: "26.02.25", category: "Billing", subcategory: "Meter", assignee: "Akshiv Rajendran" },
      { id: "E16757", title: "New Connection Application Status", date: "24.02.25", category: "Connection", subcategory: "New", assignee: "Jayakumar S" },
      { id: "E16806", title: "Transformer Maintenance Request", date: "25.02.25", category: "Infrastructure", subcategory: "Maintenance", assignee: "Akshiv Rajendran" },
    ],
    closed: [
      { id: "E15632", title: "Bill Payment Portal Issue", date: "15.02.25", category: "Payment", subcategory: "Online", assignee: "Harshankher" },
      { id: "E15589", title: "Electricity Theft Reporting", date: "12.02.25", category: "Security", subcategory: "Theft", assignee: "Jayakumar S" },
    ],
    myQueries: [
      { id: "E16817", title: "Meter Reading Discrepancy", date: "26.02.25", category: "Billing", subcategory: "Meter", assignee: "Akshiv Rajendran" },
      { id: "E16806", title: "Transformer Maintenance Request", date: "25.02.25", category: "Infrastructure", subcategory: "Maintenance", assignee: "Akshiv Rajendran" },
    ]
  });

  // Stats for the dashboard
  const stats = {
    unassigned: grievances.unassigned.length,
    assigned: grievances.assigned.length,
    closed: 16879,
    myQueries: grievances.myQueries.length
  };

  useEffect(() => {
    setEmployeeId(localStorage.getItem("employeeId") || "N/A");
    setEmail(localStorage.getItem("email") || "N/A");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("employeeId");
    localStorage.removeItem("email");
    window.location.href = "/"; // Redirect to login
  };

  return (
    <div>
        <NavBar_Departments />
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo-section">
          <h2>Electricity Department</h2>
        </div>
        <div className="user-section">
          <span>{employeeId} - {email}</span>
        </div>
      </header>

      <div className="content-area">
        <aside className="sidebar">
          <div className="menu-item active">
            <span className="icon">📋</span>
            <span>Grievances</span>
          </div>
          <div className="menu-item">
            <span className="icon">⚡</span>
            <span>Connection Status</span>
          </div>
          <div className="menu-item">
            <span className="icon">💡</span>
            <span>Load Management</span>
          </div>
          <div className="menu-item">
            <span className="icon">📊</span>
            <span>Reports</span>
          </div>
          <div className="menu-item">
            <span className="icon">⚙️</span>
            <span>Settings</span>
          </div>
          <div className="menu-item" onClick={handleLogout}>
            <span className="icon">🚪</span>
            <span>Logout</span>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-header">
            <h1>Grievances</h1>
            <div className="stats-bar">
              <div className="stat-item">
                <span>Unassigned:</span>
                <span className="stat-number">{stats.unassigned}</span>
              </div>
              <div className="stat-item">
                <span>Assigned:</span>
                <span className="stat-number">{stats.assigned}</span>
              </div>
              <div className="stat-item">
                <span>Closed:</span>
                <span className="stat-number">{stats.closed}</span>
              </div>
              <div className="stat-item">
                <span>My Queries:</span>
                <span className="stat-number">{stats.myQueries}</span>
              </div>
            </div>
          </div>

          <div className="tabs">
            <div 
              className={`tab ${activeTab === "unassigned" ? "active" : ""}`}
              onClick={() => setActiveTab("unassigned")}
            >
              Unassigned
            </div>
            <div 
              className={`tab ${activeTab === "assigned" ? "active" : ""}`}
              onClick={() => setActiveTab("assigned")}
            >
              Assigned
            </div>
            <div 
              className={`tab ${activeTab === "closed" ? "active" : ""}`}
              onClick={() => setActiveTab("closed")}
            >
              Closed
            </div>
            <div 
              className={`tab ${activeTab === "myQueries" ? "active" : ""}`}
              onClick={() => setActiveTab("myQueries")}
            >
              My Queries
            </div>
          </div>

          <div className="search-filter">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="filter-btn">
              <span>Filter</span>
              <span className="filter-icon">🔽</span>
            </button>
          </div>

          <div className="grievance-list">
            {grievances[activeTab].map((item) => (
              <div className="grievance-item" key={item.id}>
                <div className="grievance-header">
                  <div className="grievance-id">{item.id}</div>
                  <div className="grievance-title">{item.title}</div>
                  <div className="grievance-assignee">
                    {item.assignee && (
                      <>
                        <img src="/api/placeholder/24/24" alt="Assignee" className="assignee-avatar" />
                        <span>{item.assignee}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="grievance-details">
                  <div className="grievance-date">{item.date}</div>
                  <div className="grievance-categories">
                    <span className="category">{item.category}</span>
                    <span className="subcategory">{item.subcategory}</span>
                  </div>
                  <div className="grievance-status">
                    <span className={`status ${activeTab}`}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <aside className="detail-panel">
          <div className="detail-header">
            <div className="detail-avatar">
              <img src="/api/placeholder/48/48" alt="User" />
            </div>
            <div className="detail-name">Harshankher</div>
          </div>
          
          <div className="detail-content">
            <div className="message-timestamp">Today</div>
            <div className="message">
              <p>I have frequent power outages in my area</p>
              <span className="timestamp">11:29am</span>
            </div>
            
            <div className="assignment-note">
              *This query is assigned to Akshiv Rajendran*
            </div>
          </div>
          
          <div className="response-box">
            <textarea placeholder="Type your response..."></textarea>
            <div className="response-actions">
              <button className="send-btn">Send</button>
              <button className="attachment-btn">📎</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </div>
  );
};

export default ElectricityDashboard;