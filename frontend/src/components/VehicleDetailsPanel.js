/**
 * VehicleDetailsPanel Component
 * Displays government vehicle and owner information after plate detection
 */

import React from 'react';
import { Car, User, MapPin, Calendar, Shield, AlertTriangle, Building2 } from 'lucide-react';
import styles from './VehicleDetailsPanel.module.css';

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

export default function VehicleDetailsPanel({ vehicleDetails }) {
  if (!vehicleDetails || vehicleDetails.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Building2 size={20} />
        <h3>Vehicle Owner Details</h3>
        <span className={styles.source}>
          Source: {vehicleDetails[0]?.source || 'government_database'}
        </span>
      </div>

      {vehicleDetails.map((vehicle, index) => (
        <div key={index} className={styles.vehicleCard}>
          {/* Registration Info */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <Car size={16} /> Registration Details
            </h4>
            <div className={styles.grid}>
              <div className={styles.field}>
                <span className={styles.label}>Registration Number</span>
                <span className={styles.value}>{vehicle.registrationNumber}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Vehicle Class</span>
                <span className={styles.value}>{vehicle.vehicleClass}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Make / Model</span>
                <span className={styles.value}>
                  {vehicle.manufacturer} {vehicle.model}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Color</span>
                <span className={styles.value}>{vehicle.color}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Fuel Type</span>
                <span className={styles.value}>{vehicle.fuelType}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Emission Norm</span>
                <span className={styles.value}>{vehicle.normType}</span>
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <User size={16} /> Owner Information
            </h4>
            <div className={styles.grid}>
              <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                <span className={styles.label}>Owner Name</span>
                <span className={styles.value}>{vehicle.ownerName}</span>
              </div>
              <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                <span className={styles.label}>
                  <MapPin size={14} /> Address
                </span>
                <span className={styles.value}>{vehicle.ownerAddress}</span>
              </div>
            </div>
          </div>

          {/* Compliance Info */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <Shield size={16} /> Compliance & Validity
            </h4>
            <div className={styles.complianceGrid}>
              <div className={`${styles.complianceItem} ${styles[vehicle.insuranceValidUpto ? 'valid' : 'expired']}`}>
                <span className={styles.complianceLabel}>Insurance</span>
                <span className={styles.complianceValue}>
                  {formatDate(vehicle.insuranceValidUpto)}
                </span>
              </div>
              <div className={`${styles.complianceItem} ${styles[vehicle.pollutionCertValidUpto ? 'valid' : 'expired']}`}>
                <span className={styles.complianceLabel}>PUC Certificate</span>
                <span className={styles.complianceValue}>
                  {formatDate(vehicle.pollutionCertValidUpto)}
                </span>
              </div>
              <div className={`${styles.complianceItem} ${styles[vehicle.fitnessValidUpto ? 'valid' : 'expired']}`}>
                <span className={styles.complianceLabel}>Fitness</span>
                <span className={styles.complianceValue}>
                  {formatDate(vehicle.fitnessValidUpto)}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Info */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <Calendar size={16} /> Technical Details
            </h4>
            <div className={styles.grid}>
              <div className={styles.field}>
                <span className={styles.label}>Registration Date</span>
                <span className={styles.value}>
                  {formatDate(vehicle.registrationDate)}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Vehicle Age</span>
                <span className={styles.value}>{vehicle.vehicleAge} years</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Chassis Number</span>
                <span className={styles.valueMono}>{vehicle.chassisNumber}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Engine Number</span>
                <span className={styles.valueMono}>{vehicle.engineNumber}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Seating Capacity</span>
                <span className={styles.value}>{vehicle.seatingCapacity}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Gross Weight</span>
                <span className={styles.value}>{vehicle.grossWeight} kg</span>
              </div>
            </div>
          </div>

          {/* Demo Note */}
          {vehicle.note && (
            <div className={styles.demoNote}>
              <AlertTriangle size={14} />
              <span>{vehicle.note}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}