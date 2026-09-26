import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function createDummyUser() {
  try {
    // Connect to localhost since we are running on host machine where port 27017 is mapped
    await mongoose.connect('mongodb://localhost:27017/rydex');
    console.log('Connected to MongoDB');

    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String },
      role: { type: String, default: "user", enum: ["user", "partner", "admin"] },
      isEmailVerified: { type: Boolean, default: false }
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model("User", userSchema);

    const email = 'dummy@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: 'Dummy User',
        email,
        password: hashedPassword,
        isEmailVerified: true,
        role: 'user'
      });
      await user.save();
      console.log('Dummy user created successfully!');
    } else {
      user.password = hashedPassword;
      user.isEmailVerified = true;
      await user.save();
      console.log('Dummy user updated with default password!');
    }
    // First redefine the Schemas properly if needed or use mongoose.connection.collection
    const VehicleSchema = new mongoose.Schema({
      partnerId: mongoose.Schema.Types.ObjectId,
      status: { type: String, default: "pending" },
      vehicleType: String,
      registrationNumber: String,
      model: String,
      color: String,
      pricing: {
        baseFare: Number,
        perKmRate: Number,
        perMinuteRate: Number
      }
    });
    const Vehicle = mongoose.models.Vehicle || mongoose.model("Vehicle", VehicleSchema);

    let partner = await User.findOne({ email: 'partner@example.com' });
    if (!partner) {
      partner = new User({
        name: 'Dummy Partner',
        email: 'partner@example.com',
        password: hashedPassword,
        isEmailVerified: true,
        role: 'partner',
        partnerStatus: 'approved',
        mobileNumber: '9999999999'
      });
      await partner.save();
      console.log('Dummy partner created successfully!');
    } else {
      partner.password = hashedPassword;
      partner.isEmailVerified = true;
      partner.partnerStatus = 'approved';
      partner.mobileNumber = partner.mobileNumber || '9999999999';
      await partner.save();
      console.log('Dummy partner updated!');
    }

    let vehicle = await Vehicle.findOne({ partnerId: partner._id });
    if (!vehicle) {
      vehicle = new Vehicle({
        partnerId: partner._id,
        status: 'approved',
        vehicleType: 'Auto',
        registrationNumber: 'DL1234',
        model: 'Bajaj RE',
        color: 'Yellow',
        pricing: { baseFare: 50, perKmRate: 15, perMinuteRate: 2 }
      });
      await vehicle.save();
      console.log('Dummy vehicle created and approved!');
    } else {
      vehicle.status = 'approved';
      await vehicle.save();
      console.log('Dummy vehicle updated to approved!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createDummyUser();
