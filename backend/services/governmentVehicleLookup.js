/**
 * Government Vehicle Lookup Service
 * 
 * ⚠️ IMPORTANT LEGAL NOTICE:
 * This service provides a mock implementation for demonstration purposes.
 * In production, you MUST:
 * 1. Obtain proper authorization/API access from the relevant government transport authority
 * 2. Comply with all applicable data protection and privacy laws (GDPR, etc.)
 * 3. Implement proper API authentication and security measures
 * 4. Handle data storage and retention according to legal requirements
 * 
 * This mock demonstrates the expected data structure and API integration pattern.
 * Replace with actual government API endpoint when authorized.
 */

const logger = require('../config/logger');

// Mock vehicle data for demonstration (in production, replace with actual API call)
const MOCK_VEHICLE_DATABASE = {
  'MH01AB1234': {
    registrationNumber: 'MH01AB1234',
    vehicleClass: 'Motor Car (LMV)',
    fuelType: 'Petrol',
    vehicleAge: 5,
    insuranceValidUpto: '2026-03-15',
    pollutionCertValidUpto: '2025-09-30',
    fitnessValidUpto: '2028-03-14',
    ownerName: 'Rahul Sharma',
    ownerAddress: 'Flat No. 402, Green Valley Apartments, Andheri East, Mumbai - 400069',
    registrationDate: '2019-03-15',
    manufacturer: 'Maruti Suzuki',
    model: 'Swift VXi',
    color: 'White',
    chassisNumber: 'MA3DLE12345678901',
    engineNumber: 'K12MN12345678',
    seatingCapacity: 5,
    grossWeight: 1340,
    normType: 'BS VI'
  },
  'DL01CD5678': {
    registrationNumber: 'DL01CD5678',
    vehicleClass: 'Motor Car (LMV)',
    fuelType: 'Diesel',
    vehicleAge: 3,
    insuranceValidUpto: '2026-06-20',
    pollutionCertValidUpto: '2025-12-15',
    fitnessValidUpto: '2027-06-19',
    ownerName: 'Priya Singh',
    ownerAddress: 'H.No. 123, Sector 15, Rohini, New Delhi - 110089',
    registrationDate: '2021-06-20',
    manufacturer: 'Honda Cars',
    model: 'City VX',
    color: 'Silver',
    chassisNumber: 'MA3F1234567890AB',
    engineNumber: '2CNE123456789',
    seatingCapacity: 5,
    grossWeight: 1540,
    normType: 'BS VI'
  },
  'KA02EF9012': {
    registrationNumber: 'KA02EF9012',
    vehicleClass: 'Motor Car (LMV)',
    fuelType: 'Electric',
    vehicleAge: 1,
    insuranceValidUpto: '2026-08-10',
    pollutionCertValidUpto: 'N/A',
    fitnessValidUpto: '2028-08-09',
    ownerName: 'Amit Kumar',
    ownerAddress: 'Villa No. 7, Manyata Tech Park, Hebbal, Bangalore - 560024',
    registrationDate: '2024-08-10',
    manufacturer: 'Tata Motors',
    model: 'Nexon EV',
    color: 'Blue',
    chassisNumber: 'MAT3G12345678901',
    engineNumber: 'EV123456789012',
    seatingCapacity: 5,
    grossWeight: 1500,
    normType: 'BS VI'
  }
};

/**
 * Fetch vehicle details from government database
 * In production: Replace mock call with actual government API endpoint
 * 
 * @param {string} plateNumber - The detected license plate number
 * @returns {Promise<Object>} Vehicle and owner details
 */
const fetchVehicleDetails = async (plateNumber) => {
  const cleanPlate = plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  logger.info(`Looking up vehicle details for plate: ${cleanPlate}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
  
  // Check mock database
  const vehicleData = MOCK_VEHICLE_DATABASE[cleanPlate];
  
  if (vehicleData) {
    logger.info(`Vehicle found for plate: ${cleanPlate}`);
    return {
      success: true,
      data: vehicleData,
      source: 'mock_government_database',
      timestamp: new Date().toISOString()
    };
  }
  
  // For demonstration, generate mock data for unknown plates
  // In production, this should return error for unauthorized lookups
  logger.warn(`No data found for plate: ${cleanPlate} - generating demo data`);
  
  return {
    success: true,
    data: {
      registrationNumber: cleanPlate,
      vehicleClass: 'Motor Car (LMV)',
      fuelType: 'Petrol',
      vehicleAge: Math.floor(Math.random() * 10) + 1,
      insuranceValidUpto: '2026-12-31',
      pollutionCertValidUpto: '2025-12-31',
      fitnessValidUpto: '2027-12-31',
      ownerName: 'Data not available (API authorization required)',
      ownerAddress: 'Contact transport authority for details',
      registrationDate: '2020-01-01',
      manufacturer: 'Unknown',
      model: 'Unknown',
      color: 'Unknown',
      chassisNumber: 'XXXXX' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      engineNumber: 'XXXXX' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      seatingCapacity: 5,
      grossWeight: 0,
      normType: 'BS VI',
      note: 'Demo mode - real data requires government API authorization'
    },
    source: 'demo_mode',
    timestamp: new Date().toISOString()
  };
};

/**
 * Validate if the plate number format is valid
 * @param {string} plateNumber 
 * @returns {boolean}
 */
const isValidPlateFormat = (plateNumber) => {
  // Indian vehicle registration format: State code (2 letters) + District code (1-2 digits) + Alpha-numeric (4-6 chars)
  const indianPlateRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z0-9]{4,6}$/;
  return indianPlateRegex.test(plateNumber.toUpperCase());
};

/**
 * Batch lookup multiple plates
 * @param {string[]} plateNumbers 
 * @returns {Promise<Object[]>}
 */
const batchFetchVehicleDetails = async (plateNumbers) => {
  const results = await Promise.all(
    plateNumbers.map(plate => fetchVehicleDetails(plate))
  );
  return results;
};

module.exports = {
  fetchVehicleDetails,
  isValidPlateFormat,
  batchFetchVehicleDetails
};