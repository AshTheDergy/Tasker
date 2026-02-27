import React from 'react';

const CameraStaticPreview = () => {
  // Replace this URL with the actual path to your uploaded image
  const previewImage = "image_6fd47c.png"; 

  return (
    <div style={{ 
      backgroundColor: '#000', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      
      {/* Top Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '20px', 
        fontSize: '24px' 
      }}>
        <span>‹</span> {/* nupp (./pages/homescreen) */}
        <span style={{ color: '#a855f7' }}>⚡</span>
      </div>

      {/* Image Preview Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <img 
          src={previewImage} 
          alt="Camera Preview" 
          style={{ width: '100%', height: 'auto', display: 'block' }} 
        />
      </div>

      {/* Bottom Control Bar */}
      <div style={{ 
        height: '180px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative' 
      }}>
        {/* Shutter Button */} {/* nupp (./pages/homescreen) */}
        <div style={{ 
          width: '70px', 
          height: '70px', 
          backgroundColor: '#fff', 
          borderRadius: '50%',
          border: '5px solid #333'
        }} />

        {/* Flip Camera Icon */}
        <div style={{ 
          position: 'absolute', 
          right: '40px', 
          fontSize: '28px',
          fontWeight: 'bold' 
        }}>
          ⇅
        </div>
      </div>
    </div>
  );
};

export default CameraStaticPreview;