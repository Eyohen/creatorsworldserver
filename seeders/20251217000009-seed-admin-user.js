'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Admin@123456', salt);

    const userId = uuidv4();
    const adminId = uuidv4();

    // Create base user account
    await queryInterface.bulkInsert('Users', [{
      id: userId,
      email: 'admin@creatorsworld.ng',
      password: hashedPassword,
      userType: 'admin',
      status: 'active',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    // Create admin profile
    await queryInterface.bulkInsert('Admins', [{
      id: adminId,
      userId: userId,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      permissions: JSON.stringify({
        users: ['read', 'write', 'delete'],
        creators: ['read', 'write', 'delete', 'verify'],
        brands: ['read', 'write', 'delete', 'verify'],
        requests: ['read', 'write', 'delete', 'intervene'],
        payments: ['read', 'write', 'refund', 'release'],
        contracts: ['read', 'write', 'void'],
        settings: ['read', 'write'],
        reports: ['read', 'export'],
        templates: ['read', 'write', 'delete'],
        tiers: ['read', 'write'],
        categories: ['read', 'write', 'delete'],
        audit: ['read']
      }),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});

    console.log('\n========================================');
    console.log('DEFAULT ADMIN CREDENTIALS');
    console.log('========================================');
    console.log('Email: admin@creatorsworld.ng');
    console.log('Password: Admin@123456');
    console.log('========================================');
    console.log('IMPORTANT: Change this password immediately!');
    console.log('========================================\n');
  },

  async down(queryInterface, Sequelize) {
    // Delete admin profile first (foreign key constraint)
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email = 'admin@creatorsworld.ng';`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      await queryInterface.bulkDelete('Admins', { userId: users[0].id }, {});
      await queryInterface.bulkDelete('Users', { email: 'admin@creatorsworld.ng' }, {});
    }
  }
};
