import React, { useState, useEffect } from "react";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";
import ChatPanel from "../components/ChatPanel";
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const ElectricityDashboard = () => {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState("pending_acceptance");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [grievances, setGrievances] = useState({
    pending_acceptance: [],
    assigned: [],
    inProgress: [],
    resolved: [],
    closed: []
  });
  const [stats, setStats] = useState({
    pending_acceptance: 0,
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    // Connect to WebSocket
    const newSocket = io('http://localhost:5000', {
      query: {
        userId: user.id,
        role: 'official',
        department: 'Electricity',
        token: localStorage.getItem('token')
      }
    });

    setSocket(newSocket);

    // Listen for new grievance assignments
    newSocket.on('new_grievance_assigned', (grievance) => {
      console.log('New grievance assigned:', grievance);
      setNotifications(prev => [...prev, {
        type: 'assignment',
        grievanceId: grievance.id,
        content: `New grievance assigned: ${grievance.title}`,
        timestamp: new Date()
      }]);
      fetchGrievances();
    });

    // Listen for new messages
    newSocket.on('new_message', (message) => {
      console.log('New message received:', message);
      if (selectedGrievance?.id === message.grievanceId) {
        // Update chat if the grievance is currently selected
        // ChatPanel component handles this automatically
      } else {
        setNotifications(prev => [...prev, {
          type: 'message',
          grievanceId: message.grievanceId,
          content: message.content,
          timestamp: new Date()
        }]);
      }
    });

    // Listen for grievance status updates
    newSocket.on('grievance_status_updated', ({ grievanceId, newStatus }) => {
      console.log('Grievance status updated:', { grievanceId, newStatus });
      fetchGrievances();
    });

    // Listen for assignment responses
    newSocket.on('grievance_assignment_response', ({ grievanceId, accepted, officialId }) => {
      console.log('Assignment response:', { grievanceId, accepted, officialId });
      if (officialId === user.id) {
        fetchGrievances();
      }
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError('Connection error. Please refresh the page.');
    });

    return () => {
      console.log('Disconnecting socket');
      newSocket.disconnect();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    setEmployeeId(user.employeeId || "N/A");
    setEmail(user.email || "N/A");
    fetchGrievances();

    // Set up periodic refresh
    const refreshInterval = setInterval(fetchGrievances, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [user]);

  const fetchGrievances = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching grievances for official:', user.id);
      const response = await fetch(`http://localhost:5000/api/grievances/official/${user.id}?department=Electricity`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch grievances: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received grievances:', data);

      // Organize grievances by status
      const organized = {
        pending_acceptance: data.filter(g => g.status === 'pending_acceptance' && g.assignedTo === user.id),
        assigned: data.filter(g => g.status === 'assigned' && g.assignedTo === user.id),
        inProgress: data.filter(g => g.status === 'inProgress' && g.assignedTo === user.id),
        resolved: data.filter(g => g.status === 'resolved' && g.assignedTo === user.id),
        closed: data.filter(g => g.status === 'closed' && g.assignedTo === user.id)
      };

      console.log('Organized grievances:', organized);
      setGrievances(organized);
      updateStats(organized);
    } catch (error) {
      console.error('Error fetching grievances:', error);
      setError('Failed to fetch grievances. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (data = grievances) => {
    const newStats = {
      pending_acceptance: data.pending_acceptance.length,
      assigned: data.assigned.length,
      inProgress: data.inProgress.length,
      resolved: data.resolved.length,
      closed: data.closed.length
    };
    console.log('Updated stats:', newStats);
    setStats(newStats);
  };

  const handleGrievanceClick = (grievance) => {
    console.log('Selected grievance:', grievance);
    setSelectedGrievance(grievance);
    // Clear notifications for this grievance
    setNotifications(prev =>
      prev.filter(n => n.grievanceId !== grievance.id)
    );
  };

  const handleStatusUpdate = async (grievanceId, newStatus) => {
    try {
      console.log('Updating grievance status:', { grievanceId, newStatus });
      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
      }

      // Emit status update through socket
      socket?.emit('grievance_status_updated', { grievanceId, newStatus });

      // Refresh grievances after status update
      await fetchGrievances();
    } catch (error) {
      console.error('Error updating grievance status:', error);
      setError('Failed to update status. Please try again.');
    }
  };

  const handleAssignmentResponse = async (grievanceId, accept) => {
    try {
      console.log('Responding to assignment:', { grievanceId, accept });
      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/assignment-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ accept })
      });

      if (!response.ok) {
        throw new Error(`Failed to respond to assignment: ${response.statusText}`);
      }

      // If accepted, update status to assigned
      if (accept) {
        await handleStatusUpdate(grievanceId, 'assigned');
      }

      // Socket will handle the reassignment if declined
      socket?.emit('grievance_assignment_response', {
        grievanceId,
        officialId: user.id,
        accepted: accept
      });

      await fetchGrievances();
    } catch (error) {
      console.error('Error responding to assignment:', error);
      setError('Failed to respond to assignment. Please try again.');
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div>
      <NavBar_Departments notifications={notifications.length} />
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
                  <span>Pending Acceptance:</span>
                  <span className="stat-number">{stats.pending_acceptance}</span>
                </div>
                <div className="stat-item">
                  <span>Assigned:</span>
                  <span className="stat-number">{stats.assigned}</span>
                </div>
                <div className="stat-item">
                  <span>Closed:</span>
                  <span className="stat-number">{stats.closed}</span>
                </div>
              </div>
            </div>

            <div className="tabs">
              <div
                className={`tab ${activeTab === "pending_acceptance" ? "active" : ""}`}
                onClick={() => setActiveTab("pending_acceptance")}
              >
                Pending Acceptance ({stats.pending_acceptance})
              </div>
              <div
                className={`tab ${activeTab === "assigned" ? "active" : ""}`}
                onClick={() => setActiveTab("assigned")}
              >
                Assigned ({stats.assigned})
              </div>
              <div
                className={`tab ${activeTab === "inProgress" ? "active" : ""}`}
                onClick={() => setActiveTab("inProgress")}
              >
                In Progress ({stats.inProgress})
              </div>
              <div
                className={`tab ${activeTab === "resolved" ? "active" : ""}`}
                onClick={() => setActiveTab("resolved")}
              >
                Resolved ({stats.resolved})
              </div>
              <div
                className={`tab ${activeTab === "closed" ? "active" : ""}`}
                onClick={() => setActiveTab("closed")}
              >
                Closed ({stats.closed})
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
              {loading ? (
                <div className="loading-message">Loading grievances...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : grievances[activeTab].length === 0 ? (
                <div className="empty-message">
                  No grievances found in this category
                </div>
              ) : (
                grievances[activeTab].map((item) => (
                  <div
                    className={`grievance-item ${selectedGrievance?.id === item.id ? 'selected' : ''
                      } ${notifications.some(n => n.grievanceId === item.id) ? 'has-notification' : ''
                      }`}
                    key={item.id}
                    onClick={() => handleGrievanceClick(item)}
                  >
                    <div className="grievance-header">
                      <div className="grievance-id">#{item.id}</div>
                      <div className="grievance-title">{item.title}</div>
                      <div className="grievance-status">
                        <span className={`status ${item.status}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="grievance-details">
                      <div className="detail-row">
                        <span className="label">Petitioner:</span>
                        <span className="value">{item.petitioner?.firstName} {item.petitioner?.lastName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Submitted:</span>
                        <span className="value">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Priority:</span>
                        <span className="value">{item.priority}</span>
                      </div>
                      {item.status === 'pending_acceptance' && (
                        <div className="assignment-actions">
                          <button
                            className="accept-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignmentResponse(item.id, true);
                            }}
                          >
                            Accept
                          </button>
                          <button
                            className="decline-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignmentResponse(item.id, false);
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {['assigned', 'inProgress'].includes(item.status) && (
                        <div className="status-actions">
                          <button
                            className="status-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(
                                item.id,
                                item.status === 'assigned' ? 'inProgress' : 'resolved'
                              );
                            }}
                          >
                            {item.status === 'assigned' ? 'Start Work' : 'Mark Resolved'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </main>

          {selectedGrievance ? (
            <ChatPanel
              grievanceId={selectedGrievance.id}
              petitionerId={selectedGrievance.petitionerId}
              onClose={() => setSelectedGrievance(null)}
              socket={socket}
            />
          ) : (
            <aside className="detail-panel">
              <div className="detail-header">
                <div className="detail-title">
                  <h3>Select a grievance to view details</h3>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectricityDashboard;