import React, { useState, useEffect } from "react";
import "../styles/WaterBoard.css";
import NavBar_Departments from "../components/NavBar_Departments";
import ChatPanel from "../components/ChatPanel";
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socket';

const WaterDashboard = () => {
  const { user, getToken, logout } = useAuth();
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
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.error('No token available for socket connection');
      setError('Authentication required');
      return;
    }

    // Connect socket with token
    socketService.connect(token);

    // Set up socket event listeners
    socketService.on('newGrievance', (grievance) => {
      console.log('New grievance received:', grievance);
      if (grievance.department === 'Water') {
        setGrievances(prev => ({
          ...prev,
          pending_acceptance: [grievance, ...prev.pending_acceptance]
        }));
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'new',
          grievanceId: grievance._id,
          message: `New grievance received: ${grievance.subject}`
        }]);
      }
    });

    socketService.on('grievanceUpdated', (updatedGrievance) => {
      console.log('Grievance updated:', updatedGrievance);

      // Remove from all status arrays first
      setGrievances(prev => {
        const newState = {
          pending_acceptance: prev.pending_acceptance.filter(g => g._id !== updatedGrievance._id),
          assigned: prev.assigned.filter(g => g._id !== updatedGrievance._id),
          inProgress: prev.inProgress.filter(g => g._id !== updatedGrievance._id),
          resolved: prev.resolved.filter(g => g._id !== updatedGrievance._id),
          closed: prev.closed.filter(g => g._id !== updatedGrievance._id)
        };

        // Add to appropriate status array
        switch (updatedGrievance.status) {
          case 'Pending':
            newState.pending_acceptance.push(updatedGrievance);
            break;
          case 'Assigned':
            if (updatedGrievance.assignedOfficer?._id === user.id) {
              newState.assigned.push(updatedGrievance);
            }
            break;
          case 'In Progress':
            if (updatedGrievance.assignedOfficer?._id === user.id) {
              newState.inProgress.push(updatedGrievance);
            }
            break;
          case 'Resolved':
            if (updatedGrievance.assignedOfficer?._id === user.id) {
              newState.resolved.push(updatedGrievance);
            }
            break;
          case 'Closed':
            if (updatedGrievance.assignedOfficer?._id === user.id) {
              newState.closed.push(updatedGrievance);
            }
            break;
        }

        return newState;
      });

      // Add notification for the update
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'update',
        grievanceId: updatedGrievance._id,
        message: `Grievance ${updatedGrievance.subject} status updated to ${updatedGrievance.status}`
      }]);

      // Update stats
      updateStats();
    });

    socketService.on('grievanceAssigned', (data) => {
      console.log('Grievance assigned:', data);
      // Refresh grievances to get the latest assignments
      fetchGrievances();

      // Add notification for assignment
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'assignment',
        grievanceId: data.grievanceId,
        message: `Grievance assigned to ${data.assignedOfficer.firstName} ${data.assignedOfficer.lastName}`
      }]);
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [user?.id]);  // Add user.id to dependency array to reconnect if user changes

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

      const token = getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Fetching grievances for official:', user.id);
      const response = await fetch(`http://localhost:5000/api/grievances/department/Water`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch grievances: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data);

      // Organize grievances by status
      const organized = {
        pending_acceptance: [],
        assigned: [],
        inProgress: [],
        resolved: [],
        closed: []
      };

      // Process each grievance
      data.forEach(grievance => {
        const status = grievance.status;
        const isAssignedToMe = grievance.assignedOfficer?._id === user.id;

        switch (status) {
          case 'Pending':
            organized.pending_acceptance.push(grievance);
            break;
          case 'Assigned':
            if (isAssignedToMe) organized.assigned.push(grievance);
            break;
          case 'In Progress':
            if (isAssignedToMe) organized.inProgress.push(grievance);
            break;
          case 'Resolved':
            if (isAssignedToMe) organized.resolved.push(grievance);
            break;
          case 'Closed':
            if (isAssignedToMe) organized.closed.push(grievance);
            break;
          default:
            console.log(`Unhandled status: ${status} for grievance ${grievance._id}`);
        }
      });

      console.log('Organized grievances:', organized);
      setGrievances(organized);
      updateStats(organized);
    } catch (error) {
      console.error('Error fetching grievances:', error);
      setError('Failed to fetch grievances: ' + error.message);
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
      const token = getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Updating grievance status:', { grievanceId, newStatus });
      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/updateStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update status: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Status update response:', data);

      // Refresh grievances to get the updated list
      await fetchGrievances();
    } catch (error) {
      console.error('Error updating grievance status:', error);
      setError('Failed to update status: ' + error.message);
    }
  };

  const handleAssignmentResponse = async (grievanceId, accept) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Responding to assignment:', { grievanceId, accept });
      const endpoint = accept ? 'accept' : 'decline';

      // If declining, first check if there are other officials available
      if (!accept) {
        // Show confirmation dialog
        if (!window.confirm('Are you sure you want to decline this grievance? Please provide a reason if declining.')) {
          return;
        }
      }

      const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accept })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message?.includes('No other officials available')) {
          // Special handling for no available officials
          const confirmContinue = window.confirm(
            'There are no other officials available to handle this grievance. Would you like to reconsider and accept it instead?'
          );

          if (confirmContinue) {
            // Try accepting the grievance instead
            return handleAssignmentResponse(grievanceId, true);
          } else {
            throw new Error('No other officials available. Please accept the grievance or wait for more officials to become available.');
          }
        }
        throw new Error(data.message || `Failed to respond to assignment: ${response.statusText}`);
      }

      console.log('Assignment response:', data);

      // Show success message
      const message = accept ?
        'Grievance accepted successfully. You can now begin working on it.' :
        'Grievance declined successfully.';

      // Add a notification
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: accept ? 'success' : 'info',
        grievanceId: grievanceId,
        message: message
      }]);

      // Refresh grievances to get the updated list
      await fetchGrievances();
    } catch (error) {
      console.error('Error responding to assignment:', error);
      setError(error.message);

      // Add error notification
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        grievanceId: grievanceId,
        message: error.message
      }]);
    }
  };

  const handleLogout = () => {
    socketService.disconnect();
    logout(); // Use the logout function from AuthContext instead of directly manipulating localStorage
  };

  return (
    <div>
      <NavBar_Departments notifications={notifications.length} />
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="logo-section">
            <h2>Water Department</h2>
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
                grievances[activeTab].map((grievance) => (
                  <div
                    className={`grievance-item ${selectedGrievance?._id === grievance._id ? 'selected' : ''} 
                    ${notifications.some(n => n.grievanceId === grievance._id) ? 'has-notification' : ''}`}
                    key={grievance._id}
                    onClick={() => handleGrievanceClick(grievance)}
                  >
                    <div className="grievance-header">
                      <div className="grievance-id">#{grievance._id}</div>
                      <div className="grievance-title">{grievance.subject}</div>
                      <div className={`status-badge ${grievance.status.toLowerCase()}`}>
                        {grievance.status}
                      </div>
                    </div>
                    <div className="grievance-details">
                      <div className="detail-row">
                        <span className="label">Petitioner:</span>
                        <span className="value">
                          {grievance.petitioner?.firstName} {grievance.petitioner?.lastName}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Filed:</span>
                        <span className="value">
                          {new Date(grievance.dateFiled).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Priority:</span>
                        <span className={`priority-badge ${grievance.priority.toLowerCase()}`}>
                          {grievance.priority}
                        </span>
                      </div>
                      {grievance.assignedOfficer && (
                        <div className="detail-row">
                          <span className="label">Assigned To:</span>
                          <span className="value">
                            {grievance.assignedOfficer.firstName} {grievance.assignedOfficer.lastName}
                          </span>
                        </div>
                      )}

                      <div className="action-buttons">
                        {grievance.status === 'Pending' && (
                          <>
                            <button
                              className="action-btn accept"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignmentResponse(grievance._id, true);
                              }}
                            >
                              Accept Case
                            </button>
                            <button
                              className="action-btn decline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignmentResponse(grievance._id, false);
                              }}
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {grievance.status === 'Assigned' && grievance.assignedOfficer?._id === user.id && (
                          <button
                            className="action-btn start"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(grievance._id, 'In Progress');
                            }}
                          >
                            Get Started
                          </button>
                        )}

                        {grievance.status === 'In Progress' && grievance.assignedOfficer?._id === user.id && (
                          <button
                            className="action-btn resolve"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(grievance._id, 'Resolved');
                            }}
                          >
                            Mark as Resolved
                          </button>
                        )}
                      </div>
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

export default WaterDashboard;