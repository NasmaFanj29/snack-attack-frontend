import React from "react";
import { useLocation } from "react-router-dom";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import "../style/footer.css";

function Footer() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <footer className={isHomePage ? "footer home-footer" : "footer general-footer"}>
      <div className="footer-icons">
        <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-link">
          <FacebookIcon />
        </a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-link">
          <InstagramIcon />
        </a>
      </div>
    </footer>
  );
}

export default Footer;