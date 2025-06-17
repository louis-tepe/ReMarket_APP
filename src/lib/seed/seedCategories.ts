// ... existing code ...
const HIERARCHICAL_CATEGORIES_TO_SEED: SeedCategoryDefinition[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    children: [
      {
        name: 'Mobile Devices and Accessories',
        slug: 'mobile-devices-accessories',
        children: [
          {
// ... existing code ...
            name: 'Mobile Accessories',
            slug: 'mobile-accessories',
            children: [
              { name: 'Cases and Covers', slug: 'cases-covers' },
              { name: 'Chargers and Cables', slug: 'chargers-cables' },
              { name: 'Power Banks', slug: 'power-banks' },
              { name: 'Screen Protectors', slug: 'screen-protectors'},
            ],
          },
        ],
      },
      {
        name: 'Computers, Components and Office',
        slug: 'computers-components-office',
        children: [
          { name: 'Laptops', slug: 'laptops' },
// ... existing code ...
            name: 'PC Components',
            slug: 'pc-components',
            children: [
              { name: 'CPUs Processors', slug: 'cpus-processors' },
              { name: 'GPUs Graphics Cards', slug: 'gpus-graphics-cards' },
              { name: 'Motherboards', slug: 'motherboards' },
              { name: 'RAM Memory', slug: 'ram-memory' },
              { name: 'Storage SSD HDD', slug: 'storage-ssd-hdd' },
              { name: 'Power Supplies PSU', slug: 'power-supplies-psu'},
              { name: 'PC Cases', slug: 'pc-cases'},
            ],
          },
          {
            name: 'Computer Accessories',
            slug: 'computer-accessories',
            children: [
                { name: 'Keyboards', slug: 'keyboards' },
                { name: 'Mice', slug: 'mice' },
                { name: 'Webcams', slug: 'webcams' },
                { name: 'USB Hubs and Adapters', slug: 'usb-hubs-adapters' },
            ]
          },
          { name: 'Printers and Scanners', slug: 'printers-scanners' },
          { name: 'Networking Devices', slug: 'networking-devices', children: [
            { name: 'Routers', slug: 'routers'},
            { name: 'Modems', slug: 'modems'},
// ... existing code ...
        ],
      },
      {
        name: 'TV, Audio, Photo and Video',
        slug: 'tv-audio-photo-video',
        children: [
          {
            name: 'Televisions and Home Theater',
            slug: 'televisions-home-theater',
            children: [
              { name: 'Televisions', slug: 'televisions' },
              { name: 'Home Theater Systems', slug: 'home-theater-systems' },
              { name: 'Soundbars', slug: 'soundbars' },
// ... existing code ...
          {
            name: 'Audio Equipment',
            slug: 'audio-equipment',
            children: [
              { name: 'Headphones and Earbuds', slug: 'headphones-earbuds' },
              { name: 'Speakers', slug: 'speakers' , children: [
                { name: 'Portable Speakers', slug: 'portable-speakers'},
                { name: 'Bookshelf Speakers', slug: 'bookshelf-speakers'},
                { name: 'Smart Speakers', slug: 'smart-speakers'},
              ]},
              { name: 'Turntables and Accessories', slug: 'turntables-accessories' },
              { name: 'Microphones', slug: 'microphones' },
            ],
          },
          {
            name: 'Cameras, Camcorders and Drones',
            slug: 'cameras-camcorders-drones',
            children: [
              {
// ... existing code ...
                children: [
                  {
                    name: 'Lenses',
                    slug: 'lenses',
                    children: [
                      { name: 'DSLR Lenses', slug: 'dslr-lenses' }, // Depth 5
                      { name: 'Mirrorless Lenses', slug: 'mirrorless-lenses' }, // Depth 5
                      { name: 'Other Camera Lenses', slug: 'other-camera-lenses' }, // Depth 5
                    ],
                  },
                  { name: 'Tripods and Mounts', slug: 'camera-tripods-mounts' },
                  { name: 'Camera Bags and Cases', slug: 'camera-bags-cases' },
                  { name: 'Flashes and Lighting', slug: 'camera-flashes-lighting' },
                  { name: 'Camera Batteries and Chargers', slug: 'camera-batteries-chargers'},
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Gaming Consoles and Accessories',
        slug: 'gaming-consoles-accessories',
        children: [
          { name: 'Game Consoles', slug: 'game-consoles' }, // e.g., PlayStation, Xbox, Nintendo
// ... existing code ...
      }
    ],
  },
  {
    name: 'Home and Kitchen',
    slug: 'home-kitchen',
    children: [
      {
// ... existing code ...
        children: [
          { name: 'Small Kitchen Appliances', slug: 'small-kitchen-appliances', children: [
            { name: 'Coffee Makers', slug: 'coffee-makers'},
            { name: 'Blenders', slug: 'blenders'},
            { name: 'Toasters and Ovens', slug: 'toasters-ovens'},
            { name: 'Microwaves', slug: 'microwaves-small'}, // if small category exists
          ]},
          { name: 'Large Kitchen Appliances', slug: 'large-kitchen-appliances', children: [
            { name: 'Refrigerators', slug: 'refrigerators'},
            { name: 'Dishwashers', slug: 'dishwashers'},
            { name: 'Ovens and Stoves', slug: 'ovens-stoves-large'},
          ]},
        ],
      },
      { name: 'Cookware and Bakeware', slug: 'cookware-bakeware' },
      { name: 'Tableware and Cutlery', slug: 'tableware-cutlery' },
      { name: 'Home Decor', slug: 'home-decor', children: [
        { name: 'Rugs and Carpets', slug: 'rugs-carpets'},
        { name: 'Curtains and Blinds', slug: 'curtains-blinds'},
        { name: 'Vases and Decorative Bowls', slug: 'vases-decorative-bowls'},
      ]},
      { name: 'Furniture', slug: 'furniture', children: [
// ... existing code ...
        { name: 'Office Furniture', slug: 'office-furniture' }, // For home office
        { name: 'Outdoor Furniture', slug: 'outdoor-furniture' },
      ]},
      { name: 'Lighting', slug: 'lighting' },
      { name: 'Bedding and Linens', slug: 'bedding-linens' },
      { name: 'Bath Accessories', slug: 'bath-accessories' },
      { name: 'Home Storage and Organization', slug: 'home-storage-organization' },
      { name: 'Cleaning Supplies and Vacuums', slug: 'cleaning-supplies-vacuums' },
      { name: 'Gardening Tools and Supplies', slug: 'gardening-tools-supplies' },
      { name: 'Grills and Outdoor Cooking', slug: 'grills-outdoor-cooking' },
    ],
  },
  {
    name: 'Fashion and Apparel',
    slug: 'fashion-apparel',
    children: [
      { name: "Men's Fashion", slug: 'mens-fashion', children: [
        { name: "Men's Clothing", slug: 'mens-clothing' },
// ... existing code ...
        { name: "Kids' Shoes", slug: 'kids-shoes' },
      ]},
      { name: 'Bags and Luggage', slug: 'bags-luggage' },
      { name: 'Jewelry and Watches', slug: 'jewelry-watches', children: [
        { name: 'Jewelry', slug: 'jewelry'},
        { name: 'Watches', slug: 'watches-fashion'}, // distinguish from smartwatches
// ... existing code ...
