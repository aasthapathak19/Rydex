import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function createDummyAccounts() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/rydex');
    console.log('Connected to MongoDB');

    // ── User Schema (matches src/models/user.model.ts) ──────────────────────
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String },
      role: { type: String, default: 'user', enum: ['user', 'partner', 'admin'] },
      isEmailVerified: { type: Boolean, default: false },
      partnerOnBoardingSteps: { type: Number, default: 0 },
      partnerApplicationSubmittedAt: { type: Date },
      mobileNumber: { type: String },
      partnerStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: { type: String },
      otp: { type: String },
      otpExpiresAt: { type: Date },
      socketId: { type: String, default: null },
      location: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number]
      },
      isOnline: { type: Boolean, default: false }
    }, { timestamps: true });
    userSchema.index({ location: '2dsphere' });

    // ── Vehicle Schema (matches src/models/vehicle.model.ts) ────────────────
    const vehicleSchema = new mongoose.Schema({
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      type: { type: String, enum: ['bike', 'car', 'loading', 'truck', 'auto'], required: true },
      number: { type: String, required: true, unique: true },
      vehicleModel: { type: String, required: true },
      imageUrl: String,
      baseFare: Number,
      pricePerKM: Number,
      waitingCharge: Number,
      status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
      rejectionReason: String,
      isActive: { type: Boolean, default: true }
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);

    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── 1. Dummy Customer (role: user) ──────────────────────────────────────
    let customer = await User.findOne({ email: 'customer@example.com' });
    if (!customer) {
      customer = await User.create({
        name: 'Test Customer',
        email: 'customer@example.com',
        password: hashedPassword,
        role: 'user',
        isEmailVerified: true
      });
      console.log('✅ Dummy customer created: customer@example.com / password123');
    } else {
      await User.updateOne({ _id: customer._id }, { $set: { password: hashedPassword, isEmailVerified: true } });
      console.log('✅ Dummy customer password reset');
    }
    customer = await User.findOne({ email: 'customer@example.com' });

    // ── 2. Dummy Partner/Driver (role: partner, approved) ───────────────────
    let partner = await User.findOne({ email: 'partner@example.com' });
    const partnerData = {
      name: 'Test Driver',
      email: 'partner@example.com',
      password: hashedPassword,
      role: 'partner',
      isEmailVerified: true,
      mobileNumber: '9999988888',
      partnerStatus: 'approved',
      partnerOnBoardingSteps: 3,
      // Seed a location near Delhi so geo-query works (lat=28.6139, lon=77.2090)
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      isOnline: true  // Start online so user can find the driver
    };

    if (!partner) {
      partner = await User.create(partnerData);
      console.log('✅ Dummy partner created: partner@example.com / password123');
    } else {
      await User.updateOne({ _id: partner._id }, { $set: partnerData });
      partner = await User.findOne({ email: 'partner@example.com' });
      console.log('✅ Dummy partner updated and approved');
    }

    // ── 3. Dummy Vehicle linked to partner ──────────────────────────────────
    const vehicleData = {
      owner: partner._id,
      type: 'auto',
      number: 'DL01RX0001',
      vehicleModel: 'Bajaj RE Auto',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Auto-rickshaw_India.jpg/320px-Auto-rickshaw_India.jpg',
      baseFare: 30,
      pricePerKM: 12,
      waitingCharge: 2,
      status: 'approved',
      isActive: true
    };

    let vehicle = await Vehicle.findOne({ owner: partner._id });
    if (!vehicle) {
      vehicle = await Vehicle.create(vehicleData);
      console.log(`✅ Dummy vehicle created: ${vehicleData.number}`);
    } else {
      await Vehicle.updateOne({ _id: vehicle._id }, { $set: vehicleData });
      console.log(`✅ Dummy vehicle updated and approved`);
    }

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log('\n=== TEST ACCOUNTS ===');
    console.log('👤 Customer: customer@example.com  / password123  (role: user)');
    console.log('🚗 Driver:   partner@example.com   / password123  (role: partner, approved, isOnline: true)');
    console.log('🔍 Driver location seeded at: Delhi [77.2090, 28.6139]');
    console.log('\n=== HOW TO TEST ===');
    console.log('1. Open http://localhost:3001 in Window A → login as customer@example.com');
    console.log('2. Open http://localhost:3001 in Incognito → login as partner@example.com');
    console.log('3. In driver window: go to the pending-requests page, click "Go Online"');
    console.log('4. In customer window: book a ride from Delhi area');
    console.log('   (or use manual coordinates near Delhi: lat=28.6139, lon=77.2090)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

createDummyAccounts();
