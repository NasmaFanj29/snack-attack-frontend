import React from "react";
import '../style/locateus.css'; 
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';

const branchData = [
    { 
        name: "Snack Attack Mkalles", 
        address: "Mkalles Highway, next to ABC Mall.", 
        phone: "+961 3 231 506",
        hours: "Mon-Sun: 10:00 AM - 12:00 AM"
    },
    { 
        name: "Snack Attack Jal El Dib", 
        address: "Jal El Dib Main Road, facing the bridge.", 
        phone: "+961 3 231 505",
        hours: "Mon-Sun: 10:00 AM - 12:00 AM"
    },
    { 
        name: "Snack Attack Centro Mall (Jnah)", 
        address: "Centro Mall, Jnah, Food Court Level.", 
        phone: "+961 3 231 504",
        hours: "Mon-Sun: 10:00 AM - 12:00 AM"
    },
    { 
        name: "Snack Attack Tayyoune", 
        address: "Tayyoune Roundabout, Beirut, near the station.", 
        phone: "+961 3 231 503",
        hours: "Mon-Sun: 10:00 AM - 12:00 AM"
    },
];

function LocateUs() {
 return (
  <div className="locate-page" id="locate-screen-unique">
    <div className="overlay"></div> 
    
    <h1 className="locate-title">Find Our Branches</h1>
      
    <div className="branch-list">
        {branchData.map((branch, index) => (
            <div className="branch-card" key={index}>
                <h2>{branch.name}</h2>
                <div className="info-row">
                    <LocationOnIcon className="icon-green" />
                    <p><strong>Address:</strong> {branch.address}</p>
                </div>
                <div className="info-row">
                    <PhoneIcon className="icon-pink" />
                    <p><strong>Phone:</strong> {branch.phone}</p>
                </div>
                <div className="info-row">
                    <AccessTimeFilledIcon className="icon-gray" />
                    <p><strong>Hours:</strong> {branch.hours}</p>
                </div>
                
                <button className="map-btn">Get Directions</button>
            </div>
        ))}
    </div>
  </div>
 );
}

export default LocateUs;
