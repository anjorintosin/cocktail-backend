const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Cocktail = require('../models/Cocktail');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// Sample cocktails data with multiple images
const sampleCocktails = [
  {
    name: "Nigerian Sunset",
    description: "A tropical blend of palm wine, pineapple juice, and ginger with a hint of coconut cream. Perfect for warm Nigerian evenings.",
    price: 2500,
    availableStates: ["Lagos", "FCT", "Rivers", "Delta", "Akwa Ibom", "Cross River"],
    images: [
      {
        public_id: "cocktail-images/nigerian-sunset-1",
        url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/nigerian-sunset-2",
        url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
        isPrimary: false
      },
      {
        public_id: "cocktail-images/nigerian-sunset-3",
        url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Lagos Lagoon",
    description: "Refreshing mix of fresh lime, mint leaves, soda water, and local gin. Named after the beautiful Lagos lagoon.",
    price: 2200,
    availableStates: ["Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
    images: [
      {
        public_id: "cocktail-images/lagos-lagoon-1",
        url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/lagos-lagoon-2",
        url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Abuja Breeze",
    description: "Premium vodka mixed with hibiscus tea, lemon, and honey. A sophisticated drink for the capital city.",
    price: 3000,
    availableStates: ["FCT", "Niger", "Kaduna", "Kano", "Plateau"],
    images: [
      {
        public_id: "cocktail-images/abuja-breeze-1",
        url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/abuja-breeze-2",
        url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Kano Desert Rose",
    description: "Unique blend of date syrup, rose water, vodka, and fresh mint. Inspired by the beautiful desert roses of Kano.",
    price: 2800,
    availableStates: ["Kano", "Katsina", "Jigawa", "Kaduna", "Bauchi"],
    images: [
      {
        public_id: "cocktail-images/kano-desert-rose-1",
        url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/kano-desert-rose-2",
        url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
        isPrimary: false
      },
      {
        public_id: "cocktail-images/kano-desert-rose-3",
        url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Calabar Coconut Punch",
    description: "Tropical cocktail with coconut rum, pineapple juice, lime, and a splash of grenadine. Perfect for the coastal city.",
    price: 2400,
    availableStates: ["Cross River", "Akwa Ibom", "Rivers", "Bayelsa", "Delta"],
    images: [
      {
        public_id: "cocktail-images/calabar-coconut-punch-1",
        url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/calabar-coconut-punch-2",
        url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Enugu Coal Miner",
    description: "Dark and mysterious cocktail with dark rum, cola, lime, and a hint of ginger. Named after the coal mining heritage.",
    price: 2600,
    availableStates: ["Enugu", "Anambra", "Ebonyi", "Imo", "Abia"],
    images: [
      {
        public_id: "cocktail-images/enugu-coal-miner-1",
        url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/enugu-coal-miner-2",
        url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Jos Plateau Cooler",
    description: "Light and refreshing mix of white rum, cucumber, lime, and soda water. Perfect for the cool plateau weather.",
    price: 2300,
    availableStates: ["Plateau", "Bauchi", "Gombe", "Adamawa", "Taraba"],
    images: [
      {
        public_id: "cocktail-images/jos-plateau-cooler-1",
        url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/jos-plateau-cooler-2",
        url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop",
        isPrimary: false
      },
      {
        public_id: "cocktail-images/jos-plateau-cooler-3",
        url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Ibadan Crown",
    description: "Royal cocktail with premium whiskey, honey, lemon, and a touch of cinnamon. Fit for the crown city.",
    price: 3200,
    availableStates: ["Oyo", "Osun", "Ogun", "Lagos", "Ondo"],
    images: [
      {
        public_id: "cocktail-images/ibadan-crown-1",
        url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/ibadan-crown-2",
        url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Kaduna Northern Star",
    description: "Elegant cocktail with gin, elderflower, lemon, and tonic water. A star among northern cocktails.",
    price: 2700,
    availableStates: ["Kaduna", "Kano", "Katsina", "Jigawa", "Zamfara"],
    images: [
      {
        public_id: "cocktail-images/kaduna-northern-star-1",
        url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/kaduna-northern-star-2",
        url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Port Harcourt Pride",
    description: "Rich cocktail with dark rum, passion fruit, lime, and simple syrup. A proud representation of the oil city.",
    price: 2900,
    availableStates: ["Rivers", "Bayelsa", "Delta", "Akwa Ibom", "Cross River"],
    images: [
      {
        public_id: "cocktail-images/port-harcourt-pride-1",
        url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/port-harcourt-pride-2",
        url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop",
        isPrimary: false
      },
      {
        public_id: "cocktail-images/port-harcourt-pride-3",
        url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Abeokuta Rock",
    description: "Strong and bold cocktail with bourbon, orange juice, grenadine, and a cherry. As solid as the famous Olumo Rock.",
    price: 3100,
    availableStates: ["Ogun", "Lagos", "Oyo", "Osun", "Ondo"],
    images: [
      {
        public_id: "cocktail-images/abeokuta-rock-1",
        url: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/abeokuta-rock-2",
        url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
  },
  {
    name: "Benin Kingdom",
    description: "Traditional cocktail with local gin, palm wine, ginger, and honey. A royal tribute to the ancient kingdom.",
    price: 2500,
    availableStates: ["Edo", "Delta", "Anambra", "Imo", "Abia"],
    images: [
      {
        public_id: "cocktail-images/benin-kingdom-1",
        url: "https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?w=800&h=600&fit=crop",
        isPrimary: true
      },
      {
        public_id: "cocktail-images/benin-kingdom-2",
        url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&h=600&fit=crop",
        isPrimary: false
      }
    ]
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
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - remove this in production)
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Cocktail.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});
    await Cart.deleteMany({});
    console.log('✅ Cleared all existing data');

    // Create admin user
    const admin = new User(sampleAdmin);
    await admin.save();
    console.log('✅ Created admin user:', admin.email);

    // Create sample cocktails
    console.log('🍹 Creating cocktails with multiple images...');
    const cocktails = await Cocktail.insertMany(sampleCocktails);
    console.log(`✅ Created ${cocktails.length} sample cocktails with multiple images`);
    
    // Display image statistics
    let totalImages = 0;
    let cocktailsWithMultipleImages = 0;
    cocktails.forEach(cocktail => {
      if (cocktail.images && cocktail.images.length > 0) {
        totalImages += cocktail.images.length;
        if (cocktail.images.length > 1) {
          cocktailsWithMultipleImages++;
        }
      }
    });
    
    console.log(`📸 Image Statistics:`);
    console.log(`   - Total images: ${totalImages}`);
    console.log(`   - Cocktails with multiple images: ${cocktailsWithMultipleImages}`);
    console.log(`   - Average images per cocktail: ${(totalImages / cocktails.length).toFixed(1)}`);

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
