/**
 * Vehicle Result Page
 * Displays detected plate and vehicle owner details
 */

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  Car, 
  User, 
  MapPin, 
  Calendar, 
  Shield, 
  Fuel, 
  Palette,
  Settings,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Search
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './VehicleResultPage.module.css';

export default function VehicleResultPage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { currentDetection, detections } = useSelector((s) => s.detection);
  
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  // Use detection from Redux - check current first, then recent detections
  useEffect(() => {
    console.log('VehicleResultPage - currentDetection:', currentDetection);
    console.log('VehicleResultPage - detections:', detections?.slice(0, 3));
    
    // Use the most recent completed detection
    if (currentDetection?.detectionResults) {
      setResult(currentDetection);
    } else if (detections && detections.length > 0) {
      // Find the most recent completed one
      const latest = detections.find(d => d.status === 'completed' && d.detectionResults);
      if (latest) {
        setResult(latest);
      }
    }
  }, [currentDetection, detections]);
  
  // Manual search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    
    setLoading(true);
    try {
      // Call detection API with manual input
      const formData = new FormData();
      // Create a dummy image for testing - in real app would need proper handling
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1'}/detection/detect`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // For now just log - the API would return detection
      console.log('Search response:', response.data);
    } catch (err) {
      console.error('Search failed:', err);
    }
    setLoading(false);
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };
  
  const isValid = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return false;
    return new Date(dateStr) > new Date();
  };
  
  const plates = result?.detectionResults?.plates || [];
  const vehicleDetails = result?.detectionResults?.vehicleDetails || [];
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Link to="/dashboard" className={styles.backBtn}>
          <ArrowLeft size={20} /> Back
        </Link>
        <h1>Vehicle Details</h1>
      </div>
      
      {/* Search Box */}
      <div className={styles.searchSection}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Enter license plate number (e.g., MH01AB1234)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            <Search size={20} /> {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>
      
      {/* Results */}
      {result ? (
        <div className={styles.results}>
          {/* Detected Plate */}
          {plates.length > 0 && (
            <div className={styles.plateCard}>
              <div className={styles.plateHeader}>
                <Car size={24} />
                <h2>Detected License Plate</h2>
              </div>
              <div className={styles.plateNumber}>
                {plates[0].plateText}
              </div>
              <div className={styles.plateMeta}>
                <span>Confidence: {Math.round((plates[0].confidence || 0) * 100)}%</span>
                {plates[0].country && <span>Country: {plates[0].country}</span>}
              </div>
            </div>
          )}
          
          {/* Vehicle Details */}
          {vehicleDetails.length > 0 ? (
            vehicleDetails.map((vehicle, idx) => (
              <div key={idx} className={styles.vehicleCard}>
                {/* Owner Info - Highlighted */}
                <div className={styles.ownerSection}>
                  <div className={styles.ownerHeader}>
                    <User size={28} />
                    <h2>Owner Information</h2>
                  </div>
                  <div className={styles.ownerName}>{vehicle.ownerName}</div>
                  <div className={styles.ownerAddress}>
                    <MapPin size={16} />
                    {vehicle.ownerAddress}
                  </div>
                </div>
                
                {/* Vehicle Info Grid */}
                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <Truck size={20} />
                    <h4>Vehicle Details</h4>
                    <div className={styles.infoList}>
                      <div className={styles.infoRow}>
                        <span>Registration No.</span>
                        <strong>{vehicle.registrationNumber}</strong>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Vehicle Class</span>
                        <strong>{vehicle.vehicleClass}</strong>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Make / Model</span>
                        <strong>{vehicle.manufacturer} {vehicle.model}</strong>
                      </div>
                      <div className={styles.infoRow}>
                        <Palette size={16} />
                        <span>Color</span>
                        <strong>{vehicle.color}</strong>
                      </div>
                      <div className={styles.infoRow}>
                        <Fuel size={16} />
                        <span>Fuel Type</span>
                        <strong>{vehicle.fuelType}</strong>
                      </div>
                    </div>
                  </div>
                  
                  {/* Compliance Status */}
                  <div className={styles.complianceCard}>
                    <Shield size={20} />
                    <h4>Compliance Status</h4>
                    <div className={styles.complianceList}>
                      <div className={`${styles.complianceItem} ${isValid(vehicle.insuranceValidUpto) ? styles.valid : styles.expired}`}>
                        {isValid(vehicle.insuranceValidUpto) ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        <span>Insurance</span>
                        <strong>{formatDate(vehicle.insuranceValidUpto)}</strong>
                      </div>
                      <div className={`${styles.complianceItem} ${isValid(vehicle.pollutionCertValidUpto) ? styles.valid : styles.expired}`}>
                        {isValid(vehicle.pollutionCertValidUpto) ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        <span>PUC Certificate</span>
                        <strong>{formatDate(vehicle.pollutionCertValidUpto)}</strong>
                      </div>
                      <div className={`${styles.complianceItem} ${isValid(vehicle.fitnessValidUpto) ? styles.valid : styles.expired}`}>
                        {isValid(vehicle.fitnessValidUpto) ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        <span>Fitness</span>
                        <strong>{formatDate(vehicle.fitnessValidUpto)}</strong>
                      </div>
                    </div>
                  </div>
                  
                  {/* Technical Info */}
                  <div className={styles.techCard}>
                    <Settings size={20} />
                    <h4>Technical Details</h4>
                    <div className={styles.infoList}>
                      <div className={styles.infoRow}>
                        <Calendar size={16} />
                        <span>Registration Date</span>
                        <strong>{formatDate(vehicle.registrationDate)}</strong>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Vehicle Age</span>
                        <strong>{vehicle.vehicleAge} years</strong>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Seating Capacity</span>
                        <strong>{vehicle.seatingCapacity} seats</strong>
                      </div>
                      <div className={styles.infoRow}>
                        <span>Emission Norm</span>
                        <strong>{vehicle.normType}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Demo Note */}
                {vehicle.note && (
                  <div className={styles.demoNote}>
                    <AlertTriangle size={16} />
                    <span>{vehicle.note}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles.noData}>
              <AlertTriangle size={48} />
              <h3>No Vehicle Details Found</h3>
              <p>Could not find vehicle details for this plate number.</p>
              {plates.length === 0 && (
                <p>Please upload an image to detect a license plate first.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.empty}>
          <Search size={64} />
          <h2>Search for Vehicle Details</h2>
          <p>Upload an image to detect a license plate, or enter a plate number above to search.</p>
          <button onClick={() => navigate('/ai-detection')} className={styles.uploadBtn}>
            Go to Detection
          </button>
        </div>
      )}
    </div>
  );
}