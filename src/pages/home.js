import React from "react";
import "../style/home.css";
import { Link } from "react-router-dom";
import burgerImg from "../assets/try1122.jpg"; 
import logoburger from "../assets/logoburger.png"; 

function Home() {
  return (
    <div className="home-wrapper">
      <div
        className="full-image-bg"
        style={{ backgroundImage: `url(${burgerImg})` }}
      ></div>

      <div className="home-content">
        <div className="logo-title-container">
          <span className="sticker-letter yellow-text">SN</span>
          <img
            src={logoburger}
            alt="burger sticker"
            className="sticker-logo-img"
          />
          <span className="sticker-letter yellow-text">CK</span>
          <span className="sticker-letter green-text">ATTACK</span>
        </div>

        <div className="story-section-clean">
          <p className="story-text">
            It all started with a simple idea: people love good food, but life is
            busy. We wanted to create a place where delicious meals meet
            convenience.

            From browsing our menu to placing an order, every step is made easy
            and enjoyable. Our goal is simple — bring happiness to every meal and
            make every customer feel at home, whether they dine in or order
            online.
          </p>
        </div>

       
      </div>
    </div>
  );
}

export default Home;
