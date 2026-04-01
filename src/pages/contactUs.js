import React from 'react';
import '../style/contactus.css'; 

function ContactUs() {
    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Thank you for your message! We will get back to you soon.');
    };

    return (
        <div className="contact-page">
            <h1 className="contact-title">Get In Touch</h1>

            <div className="contact-content">
                <div className="contact-form-container">
                    <h2>Send Us a Message</h2>
                    <form onSubmit={handleSubmit}>
                        <input type="text" placeholder="Your Name" required />
                        <input type="email" placeholder="Your Email" required />
                        <textarea placeholder="Your Message" rows="5" required></textarea>
                        <button type="submit" className="submit-btn">
                            Submit Message
                        </button>
                    </form>
                </div>

                <div className="contact-info">
                    <h2>Our Details</h2>
                    <p>📞 Phone: +961 231 501</p>
                    <p>📧 Email: support@snackattack.com</p>
                    <p>🕒 Hours: Mon - Sat, 8:00 AM - 12:00 AM</p>
                </div>
            </div>
        </div>
    );
}

export default ContactUs;
