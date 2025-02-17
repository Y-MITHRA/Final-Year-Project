import React from 'react';
import shield2 from '../assets/shield2.png';
const Footer = () => {
  return (
    <footer className="bg-dark text-light py-4">
      <div className="container">
        <div className="row">
          <div className="col-lg-4 mb-4 mb-lg-0">
            <div className="d-flex align-items-center mb-3">
              <img src={shield2} alt="Logo" width="32" height="32" className="me-2 rounded" />
              <h5 className="mb-0 fw-bold">Grievance Portal</h5>
            </div>
            <p className="text-muted small mb-4">
              A dedicated platform to address and resolve grievances efficiently and transparently.
            </p>
          </div>

          <div className="col-lg-8">
            <div className="row">
              <div className="col-md-4 mb-4 mb-md-0">
                <h6 className="fw-bold mb-3">Quick Links</h6>
                <ul className="list-unstyled small">
                  <li className="mb-2"><a href="#" className="text-decoration-none text-muted">Home</a></li>
                  <li className="mb-2"><a href="#" className="text-decoration-none text-muted">About Us</a></li>
                  <li className="mb-2"><a href="#" className="text-decoration-none text-muted">Contact</a></li>
                  <li><a href="#" className="text-decoration-none text-muted">FAQs</a></li>
                </ul>
              </div>

              <div className="col-md-4 mb-4 mb-md-0">
                <h6 className="fw-bold mb-3">Legal</h6>
                <ul className="list-unstyled small">
                  <li className="mb-2"><a href="#" className="text-decoration-none text-muted">Privacy Policy</a></li>
                  <li className="mb-2"><a href="#" className="text-decoration-none text-muted">Terms of Service</a></li>
                  <li><a href="#" className="text-decoration-none text-muted">Data Protection</a></li>
                </ul>
              </div>

              <div className="col-md-4">
                <h6 className="fw-bold mb-3">Connect</h6>
                <ul className="list-unstyled small">
                  <li className="mb-2"><a href="#" className="text-decoration-none text-muted">Email Us</a></li>
                  <li className="mb-2"><a href="#" className="text-decoration-none text-muted">Helpline</a></li>
                  <li><a href="#" className="text-decoration-none text-muted">Social Media</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="border-top border-secondary mt-4 pt-3 text-center text-md-start small text-muted">
          <p className="mb-0">&copy; {new Date().getFullYear()} Grievance Portal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
