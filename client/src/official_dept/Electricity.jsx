import React from "react";

const ElectricityDashboard = () => {
    return (
        <div className="container mt-5">
            <h1 className="text-center">Electricity Department Dashboard</h1>
            <div className="card p-4">
                <p>Welcome to the Electricity Department's portal. Manage power-related grievances, track maintenance requests, and respond to queries efficiently.</p>

                <ul>
                    <li>View Power Outage Reports</li>
                    <li>Track Maintenance Progress</li>
                    <li>Manage Electricity Notifications</li>
                </ul>
            </div>
        </div>
    );
};

export default ElectricityDashboard;
