import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../shared/Footer";
import NavBar from "../components/NavBar";
import { AlertCircle, Upload, Loader2, CheckCircle } from "lucide-react";
import { Form, Button, Container, Row, Col, Alert } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosConfig";
import { toast } from "react-hot-toast";

const SubmitGrievance = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        department: "",
        subject: "",
        description: "",
        file: null,
        priority: "Medium",
        expectedResolution: ""
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [error, setError] = useState(null);

    const departments = ["RTO", "Water", "Electricity", "Road", "Hospital"];

    const validateForm = () => {
        const newErrors = {};

        if (!formData.department) newErrors.department = "Select a department";
        if (!formData.subject.trim()) newErrors.subject = "Subject is required";
        if (!formData.description.trim()) {
            newErrors.description = "Description is required";
        } else if (formData.description.length < 50) {
            newErrors.description = "Description must be at least 50 characters";
        }
        if (!formData.expectedResolution) {
            newErrors.expectedResolution = "Expected resolution date is required";
        } else {
            const selectedDate = new Date(formData.expectedResolution);
            const today = new Date();
            if (selectedDate < today) {
                newErrors.expectedResolution = "Expected resolution date must be in the future";
            }
        }

        if (formData.file) {
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (formData.file.size > maxSize) {
                newErrors.file = "File size must not exceed 5MB";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFormData((prev) => ({
            ...prev,
            file,
        }));
        if (errors.file) {
            setErrors((prev) => ({
                ...prev,
                file: "",
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus(null);
        setError(null);

        if (!user?.id) {
            setError('User not authenticated. Please log in again.');
            setSubmitStatus("error");
            return;
        }

        if (validateForm()) {
            setIsSubmitting(true);
            try {
                // Format the expected resolution date to ISO string
                const expectedResolutionDate = new Date(formData.expectedResolution);
                expectedResolutionDate.setHours(23, 59, 59);

                // Create the request payload
                const grievanceData = {
                    department: formData.department,
                    subject: formData.subject,
                    description: formData.description,
                    priority: formData.priority,
                    expectedResolution: expectedResolutionDate.toISOString()
                };

                console.log('Submitting grievance with data:', grievanceData);

                // If there's a file, use FormData, otherwise send JSON
                let response;
                if (formData.file) {
                    const formDataToSend = new FormData();
                    // Append all fields to FormData
                    Object.entries(grievanceData).forEach(([key, value]) => {
                        formDataToSend.append(key, value);
                    });
                    formDataToSend.append('file', formData.file);

                    response = await axiosInstance.post('/api/grievances/create', formDataToSend, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                } else {
                    response = await axiosInstance.post('/api/grievances/create', grievanceData);
                }

                console.log('Grievance submitted successfully:', response.data);

                setSubmitStatus("success");
                setFormData({
                    department: "",
                    subject: "",
                    description: "",
                    file: null,
                    priority: "Medium",
                    expectedResolution: ""
                });

                // Show success message and redirect
                toast.success('Grievance submitted successfully!');
                setTimeout(() => {
                    navigate('/petitioner-dashboard');
                }, 2000);
            } catch (error) {
                console.error('Error submitting grievance:', error);
                setSubmitStatus("error");

                // Log detailed error information
                if (error.response) {
                    console.error('Error response:', error.response.data);
                    setError(error.response.data.message || 'Failed to submit grievance');
                } else if (error.request) {
                    console.error('No response received:', error.request);
                    setError('No response received from server. Please try again.');
                } else {
                    console.error('Error:', error.message);
                    setError('Error submitting grievance. Please try again.');
                }
                toast.error(error.response?.data?.message || 'Failed to submit grievance');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <>
            <NavBar />
            <Container className="py-5">
                <Row className="justify-content-center">
                    <Col md={8}>
                        <div className="p-4 border rounded shadow bg-white">
                            <h2 className="mb-3">Submit Grievance</h2>
                            <p className="text-muted">
                                Please fill out the form below with your grievance details.
                            </p>

                            {submitStatus === "success" && (
                                <Alert variant="success">
                                    <CheckCircle className="me-2" />
                                    Grievance submitted successfully! Redirecting to dashboard...
                                </Alert>
                            )}
                            {submitStatus === "error" && (
                                <Alert variant="danger">
                                    <AlertCircle className="me-2" />
                                    {error || 'Error submitting grievance. Please try again.'}
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit}>
                                {/* Department */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Department *</Form.Label>
                                    <Form.Select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.department}
                                    >
                                        <option value="">Select a department</option>
                                        {departments.map((dept) => (
                                            <option key={dept} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    <Form.Control.Feedback type="invalid">
                                        {errors.department}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Subject */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Subject *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.subject}
                                        placeholder="Enter grievance subject"
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.subject}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Description */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Description *</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.description}
                                        placeholder="Describe the issue in detail"
                                        rows={4}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.description}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Priority */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Priority</Form.Label>
                                    <Form.Select
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </Form.Select>
                                </Form.Group>

                                {/* Expected Resolution Date */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Expected Resolution Date *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="expectedResolution"
                                        value={formData.expectedResolution}
                                        onChange={handleInputChange}
                                        isInvalid={!!errors.expectedResolution}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.expectedResolution}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* File Upload */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Supporting Document (Optional)</Form.Label>
                                    <Form.Control
                                        type="file"
                                        onChange={handleFileChange}
                                        isInvalid={!!errors.file}
                                    />
                                    {errors.file && (
                                        <Form.Control.Feedback type="invalid">
                                            {errors.file}
                                        </Form.Control.Feedback>
                                    )}
                                </Form.Group>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-100"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="me-2" size={18} />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="me-2" size={18} />
                                            Submit Grievance
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </div>
                    </Col>
                </Row>
            </Container>
            <Footer />
        </>
    );
};

export default SubmitGrievance;
