import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { LogIn, ArrowLeft } from "lucide-react";
import { useAuth } from '../context/AuthContext';

const OfficialLogin = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        employeeId: "",
        email: "",
        password: "",
        department: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState("");
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        // Validate Employee ID
        if (!formData.employeeId.trim()) {
            newErrors.employeeId = "Employee ID is required";
        } else if (!/^[A-Z0-9]{4,10}$/.test(formData.employeeId.trim())) {
            newErrors.employeeId = "Invalid Employee ID format";
        }

        // Validate Email
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }

        // Validate Password
        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        // Validate Department
        if (!formData.department) {
            newErrors.department = "Please select a department";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            const dashboardPath = await login(
                formData.email,
                formData.password,
                'official',
                {
                    employeeId: formData.employeeId,
                    department: formData.department
                }
            );
            console.log('Login successful, redirecting to:', dashboardPath);
            navigate(dashboardPath);
        } catch (error) {
            console.error("Login error:", error);
            setServerError(error.message || "Login failed. Please check your credentials or try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <NavBar />
            <div className="container py-4">
                <div className="d-flex align-items-center mb-4">
                    <Link to="/login" className="btn btn-outline-success me-3">
                        <ArrowLeft size={18} className="me-1" /> Back
                    </Link>
                    <h2 className="mb-0">Official Login</h2>
                </div>
                <div className="card shadow-sm">
                    <div className="card-body">
                        <div className="row mb-4 justify-content-center">
                            <div className="col-md-6">
                                <div className="text-center mb-4">
                                    <div className="bg-success d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: "80px", height: "80px" }}>
                                        <LogIn size={40} className="text-white" />
                                    </div>
                                    <h4>Official Access</h4>
                                    <p className="text-muted">Enter your credentials to access the official panel</p>
                                </div>
                                {serverError && (
                                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                        {serverError}
                                        <button type="button" className="btn-close" onClick={() => setServerError("")}></button>
                                    </div>
                                )}
                                <form onSubmit={handleSubmit} noValidate>
                                    <div className="mb-3">
                                        <label htmlFor="employeeId" className="form-label">Employee ID*</label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.employeeId ? "is-invalid" : ""}`}
                                            id="employeeId"
                                            name="employeeId"
                                            value={formData.employeeId}
                                            onChange={handleChange}
                                            placeholder="Enter your Employee ID"
                                            disabled={isLoading}
                                            required
                                        />
                                        {errors.employeeId && <div className="invalid-feedback">{errors.employeeId}</div>}
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label">Email*</label>
                                        <input
                                            type="email"
                                            className={`form-control ${errors.email ? "is-invalid" : ""}`}
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter your email"
                                            disabled={isLoading}
                                            required
                                        />
                                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="password" className="form-label">Password*</label>
                                        <input
                                            type="password"
                                            className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                            disabled={isLoading}
                                            required
                                        />
                                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="department" className="form-label">Department*</label>
                                        <select
                                            className={`form-control ${errors.department ? "is-invalid" : ""}`}
                                            id="department"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleChange}
                                            disabled={isLoading}
                                            required
                                        >
                                            <option value="">Select Department</option>
                                            <option value="Water">Water</option>
                                            <option value="RTO">RTO</option>
                                            <option value="Electricity">Electricity</option>
                                        </select>
                                        {errors.department && <div className="invalid-feedback">{errors.department}</div>}
                                    </div>
                                    <div className="d-grid gap-2 mt-4">
                                        <button
                                            type="submit"
                                            className="btn btn-success btn-lg"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Logging in...
                                                </>
                                            ) : (
                                                'Login'
                                            )}
                                        </button>
                                    </div>
                                </form>
                                <div className="text-center mt-4">
                                    <p>Don't have an account? <Link to="/register/official" className="text-success">Register here</Link></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default OfficialLogin;