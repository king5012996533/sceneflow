const bcrypt = require("/tmp/node_modules/bcryptjs");
bcrypt.hash("admin123", 10).then(h => console.log(h));
