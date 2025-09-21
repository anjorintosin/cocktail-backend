const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Cocktail = require('../models/Cocktail');

// Sample cocktails data
const sampleCocktails = [
  {
    name: "Nigerian Sunset",
    description: "A tropical blend of palm wine, pineapple juice, and ginger with a hint of coconut cream. Perfect for warm Nigerian evenings.",
    price: 2500,
    availableStates: ["Lagos", "FCT", "Rivers", "Delta", "Akwa Ibom", "Cross River"],
    image: {
      public_id: "cocktail-images/nigerian-sunset",
      url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Lagos Lagoon",
    description: "Refreshing mix of fresh lime, mint leaves, soda water, and local gin. Named after the beautiful Lagos lagoon.",
    price: 2200,
    availableStates: ["Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
    image: {
      public_id: "cocktail-images/lagos-lagoon",
      url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Abuja Breeze",
    description: "Premium vodka mixed with hibiscus tea, lemon, and honey. A sophisticated drink for the capital city.",
    price: 3000,
    availableStates: ["FCT", "Niger", "Kaduna", "Kano", "Plateau"],
    image: {
      public_id: "cocktail-images/abuja-breeze",
      url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Kano Desert Rose",
    description: "Unique blend of date syrup, rose water, vodka, and fresh mint. Inspired by the beautiful desert roses of Kano.",
    price: 2800,
    availableStates: ["Kano", "Katsina", "Jigawa", "Kaduna", "Bauchi"],
    image: {
      public_id: "cocktail-images/kano-desert-rose",
      url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Calabar Coconut Punch",
    description: "Tropical cocktail with coconut rum, pineapple juice, lime, and a splash of grenadine. Perfect for the coastal city.",
    price: 2400,
    availableStates: ["Cross River", "Akwa Ibom", "Rivers", "Bayelsa", "Delta"],
    image: {
      public_id: "cocktail-images/calabar-coconut-punch",
      url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Enugu Coal Miner",
    description: "Dark and mysterious cocktail with dark rum, cola, lime, and a hint of ginger. Named after the coal mining heritage.",
    price: 2600,
    availableStates: ["Enugu", "Anambra", "Ebonyi", "Imo", "Abia"],
    image: {
      public_id: "cocktail-images/enugu-coal-miner",
      url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Jos Plateau Cooler",
    description: "Light and refreshing mix of white rum, cucumber, lime, and soda water. Perfect for the cool plateau weather.",
    price: 2300,
    availableStates: ["Plateau", "Bauchi", "Gombe", "Adamawa", "Taraba"],
    image: {
      public_id: "cocktail-images/jos-plateau-cooler",
      url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Ibadan Crown",
    description: "Royal cocktail with premium whiskey, honey, lemon, and a touch of cinnamon. Fit for the crown city.",
    price: 3200,
    availableStates: ["Oyo", "Osun", "Ogun", "Lagos", "Ondo"],
    image: {
      public_id: "cocktail-images/ibadan-crown",
      url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Kaduna Northern Star",
    description: "Elegant cocktail with gin, elderflower, lemon, and tonic water. A star among northern cocktails.",
    price: 2700,
    availableStates: ["Kaduna", "Kano", "Katsina", "Jigawa", "Zamfara"],
    image: {
      public_id: "cocktail-images/kaduna-northern-star",
      url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Port Harcourt Pride",
    description: "Rich cocktail with dark rum, passion fruit, lime, and simple syrup. A proud representation of the oil city.",
    price: 2900,
    availableStates: ["Rivers", "Bayelsa", "Delta", "Akwa Ibom", "Cross River"],
    image: {
      public_id: "cocktail-images/port-harcourt-pride",
      url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Abeokuta Rock",
    description: "Strong and bold cocktail with bourbon, orange juice, grenadine, and a cherry. As solid as the famous Olumo Rock.",
    price: 3100,
    availableStates: ["Ogun", "Lagos", "Oyo", "Osun", "Ondo"],
    image: {
      public_id: "cocktail-images/abeokuta-rock",
      url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop"
    }
  },
  {
    name: "Benin Kingdom",
    description: "Traditional cocktail with local gin, palm wine, ginger, and honey. A royal tribute to the ancient kingdom.",
    price: 2500,
    availableStates: ["Edo", "Delta", "Anambra", "Imo", "Abia"],
    image: {
      public_id: "cocktail-images/benin-kingdom",
      url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop"
    }
  }
];

// Sample admin user
const sampleAdmin = {
  email: 'admin@cocktail.com',
  password: 'admin123',
  role: 'admin'
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data (optional - remove this in production)
    await User.deleteMany({});
    await Cocktail.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = new User(sampleAdmin);
    await admin.save();
    console.log('✅ Created admin user:', admin.email);

    // Create sample cocktails
    const cocktails = await Cocktail.insertMany(sampleCocktails);
    console.log(`✅ Created ${cocktails.length} sample cocktails`);

    // Display created cocktails by state
    const stateCounts = {};
    cocktails.forEach(cocktail => {
      cocktail.availableStates.forEach(state => {
        stateCounts[state] = (stateCounts[state] || 0) + 1;
      });
    });

    console.log('\n📊 Cocktails available by state:');
    Object.entries(stateCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count} cocktails`);
      });

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nAdmin credentials:');
    console.log(`Email: ${sampleAdmin.email}`);
    console.log(`Password: ${sampleAdmin.password}`);
    console.log('\nYou can now start the server with: npm run dev');
    console.log('API documentation will be available at: http://localhost:3000/docs');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
seedDatabase();
