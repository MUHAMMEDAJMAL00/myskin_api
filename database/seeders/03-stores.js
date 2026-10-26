module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert(
      "stores",
      [
        {
          name: "Main Store",
          code: "MAIN",
          address: "123 Main Street",
          phone: "9876543210",
          email: "main@posapp.com",
          currency: "INR",
          timezone: "Asia/Kolkata",
          is_active: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      { ignoreDuplicates: true },
    );
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete("stores", null, {});
  },
};
