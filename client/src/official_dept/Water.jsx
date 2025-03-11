import React from "react";

const WaterDashboard = () => {
    // const officialName = localStorage.getItem("officialName");
    const officialEmail = localStorage.getItem("officialEmail");

    return (
        <div className="container mt-5">
            <h1 className="text-center">Water Department Dashboard</h1>
            <div className="card p-4 shadow">
                {/* <h3>Welcome, {officialName || "Official"}!</h3> */}
                <p>Email: {officialEmail || "N/A"}</p>

                <p>Manage water-related grievances and infrastructure efficiently.</p>

                <ul>
                    <li>Track Pipeline Maintenance</li>
                    <li>Respond to Water Supply Complaints</li>
                    <li>Manage Department Notifications</li>
                </ul>
            </div>
        </div>
    );
};

export default WaterDashboard;


