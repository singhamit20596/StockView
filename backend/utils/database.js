/**
 * Database Utility Module
 * Handles JSON file-based database operations with async/await and error handling
 */

const fs = require('fs').promises;
const path = require('path');

class Database {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.tablesPath = {
      accounts: path.join(this.dataDir, 'accounts.json'),
      stocks: path.join(this.dataDir, 'stocks.json'),
      views: path.join(this.dataDir, 'views.json')
    };
    this.initializeDatabase();
  }

  /**
   * Initialize database directory and files if they don't exist
   */
  async initializeDatabase() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });

      // Initialize table files with empty arrays if they don't exist
      for (const [tableName, filePath] of Object.entries(this.tablesPath)) {
        try {
          await fs.access(filePath);
        } catch (error) {
          if (error.code === 'ENOENT') {
            await fs.writeFile(filePath, JSON.stringify([], null, 2));
            console.log(`📁 Initialized ${tableName} table`);
          }
        }
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Read data from a table
   * @param {string} tableName - Name of the table (accounts, stocks, views)
   * @returns {Promise<Array>} Array of records
   */
  async read(tableName) {
    try {
      const filePath = this.tablesPath[tableName];
      if (!filePath) {
        throw new Error(`Table '${tableName}' does not exist`);
      }

      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      console.error(`Error reading ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Write data to a table
   * @param {string} tableName - Name of the table
   * @param {Array} data - Array of records to write
   * @returns {Promise<void>}
   */
  async write(tableName, data) {
    try {
      const filePath = this.tablesPath[tableName];
      if (!filePath) {
        throw new Error(`Table '${tableName}' does not exist`);
      }

      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing to ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Insert a new record into a table
   * @param {string} tableName - Name of the table
   * @param {Object} record - Record to insert
   * @returns {Promise<Object>} Inserted record with timestamp
   */
  async insert(tableName, record) {
    try {
      const data = await this.read(tableName);
      const recordWithTimestamp = {
        ...record,
        updatedAt: new Date().toISOString()
      };
      
      data.push(recordWithTimestamp);
      await this.write(tableName, data);
      
      return recordWithTimestamp;
    } catch (error) {
      console.error(`Error inserting into ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update records in a table based on filter
   * @param {string} tableName - Name of the table
   * @param {Function} filter - Filter function to match records
   * @param {Object} updates - Updates to apply
   * @returns {Promise<number>} Number of updated records
   */
  async update(tableName, filter, updates) {
    try {
      const data = await this.read(tableName);
      let updatedCount = 0;

      const updatedData = data.map(record => {
        if (filter(record)) {
          updatedCount++;
          return {
            ...record,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return record;
      });

      await this.write(tableName, updatedData);
      return updatedCount;
    } catch (error) {
      console.error(`Error updating ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete records from a table based on filter
   * @param {string} tableName - Name of the table
   * @param {Function} filter - Filter function to match records to delete
   * @returns {Promise<number>} Number of deleted records
   */
  async delete(tableName, filter) {
    try {
      const data = await this.read(tableName);
      const initialLength = data.length;
      
      const filteredData = data.filter(record => !filter(record));
      await this.write(tableName, filteredData);
      
      return initialLength - filteredData.length;
    } catch (error) {
      console.error(`Error deleting from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find records in a table based on filter
   * @param {string} tableName - Name of the table
   * @param {Function} filter - Filter function to match records
   * @returns {Promise<Array>} Array of matching records
   */
  async find(tableName, filter) {
    try {
      const data = await this.read(tableName);
      return data.filter(filter);
    } catch (error) {
      console.error(`Error finding in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find a single record in a table based on filter
   * @param {string} tableName - Name of the table
   * @param {Function} filter - Filter function to match record
   * @returns {Promise<Object|null>} Matching record or null
   */
  async findOne(tableName, filter) {
    try {
      const data = await this.read(tableName);
      return data.find(filter) || null;
    } catch (error) {
      console.error(`Error finding one in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check if a record exists in a table based on filter
   * @param {string} tableName - Name of the table
   * @param {Function} filter - Filter function to match record
   * @returns {Promise<boolean>} True if record exists, false otherwise
   */
  async exists(tableName, filter) {
    try {
      const record = await this.findOne(tableName, filter);
      return record !== null;
    } catch (error) {
      console.error(`Error checking existence in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get total count of records in a table
   * @param {string} tableName - Name of the table
   * @param {Function} [filter] - Optional filter function
   * @returns {Promise<number>} Count of records
   */
  async count(tableName, filter = null) {
    try {
      const data = await this.read(tableName);
      return filter ? data.filter(filter).length : data.length;
    } catch (error) {
      console.error(`Error counting in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Perform bulk insert operation
   * @param {string} tableName - Name of the table
   * @param {Array} records - Array of records to insert
   * @returns {Promise<Array>} Array of inserted records
   */
  async bulkInsert(tableName, records) {
    try {
      const data = await this.read(tableName);
      const timestamp = new Date().toISOString();
      
      const recordsWithTimestamp = records.map(record => ({
        ...record,
        updatedAt: timestamp
      }));
      
      data.push(...recordsWithTimestamp);
      await this.write(tableName, data);
      
      return recordsWithTimestamp;
    } catch (error) {
      console.error(`Error bulk inserting into ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data from a table
   * @param {string} tableName - Name of the table
   * @returns {Promise<void>}
   */
  async clear(tableName) {
    try {
      await this.write(tableName, []);
    } catch (error) {
      console.error(`Error clearing ${tableName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new Database();
