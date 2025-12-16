import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Link,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

export default function ConnectionGuide() {
  const guides = [
    {
      provider: 'Supabase',
      logo: '🟢',
      difficulty: 'Easy',
      steps: [
        'Go to your Supabase project dashboard at https://supabase.com/dashboard',
        'Click on "Settings" in the left sidebar',
        'Navigate to "Database" section',
        'Scroll down to "Connection string" section',
        'Copy the "URI" connection string (it starts with postgresql://)',
        'Replace [YOUR-PASSWORD] with your actual database password',
      ],
      format: 'postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres',
      example: 'postgresql://postgres.abcdefghij:yourpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
      notes: [
        'Use the "Connection Pooling" URI for better performance',
        'Enable SSL mode for secure connections',
        'Free tier includes 500MB database storage',
      ],
    },
    {
      provider: 'Neon',
      logo: '⚡',
      difficulty: 'Easy',
      steps: [
        'Log in to your Neon console at https://console.neon.tech',
        'Select your project',
        'Go to the "Dashboard" tab',
        'Look for "Connection Details" section',
        'Click "Show" next to the connection string',
        'Copy the connection string that appears',
      ],
      format: 'postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require',
      example: 'postgresql://myuser:mypassword@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require',
      notes: [
        'Neon automatically includes sslmode=require',
        'Supports branching - each branch has its own connection string',
        'Free tier includes 0.5GB storage',
      ],
    },
    {
      provider: 'Railway',
      logo: '🚂',
      difficulty: 'Easy',
      steps: [
        'Open your Railway project at https://railway.app',
        'Click on your PostgreSQL database service',
        'Go to the "Connect" tab',
        'Find "Postgres Connection URL"',
        'Click to copy the full connection string',
      ],
      format: 'postgresql://postgres:[password]@[host].railway.app:[port]/railway',
      example: 'postgresql://postgres:MySecretPass123@containers-us-west-123.railway.app:5432/railway',
      notes: [
        'Railway provides both public and private connection strings',
        'Use the public connection string for external access',
        'Free tier includes $5 credit per month',
      ],
    },
    {
      provider: 'AWS RDS',
      logo: '☁️',
      difficulty: 'Medium',
      steps: [
        'Log in to AWS Console at https://console.aws.amazon.com',
        'Navigate to RDS service',
        'Select your PostgreSQL database instance',
        'Click on "Configuration" tab',
        'Find the "Endpoint" (host address) and "Port"',
        'Construct connection string using: postgresql://username:password@endpoint:port/database',
      ],
      format: 'postgresql://[username]:[password]@[endpoint]:[port]/[database]',
      example: 'postgresql://admin:mypassword@mydb.c9akciq32.us-east-1.rds.amazonaws.com:5432/postgres',
      notes: [
        'Ensure your security group allows inbound traffic on port 5432',
        'Use SSL/TLS for production databases',
        'Master username is set during database creation',
        'Free tier includes 750 hours/month of db.t2.micro',
      ],
    },
    {
      provider: 'Heroku Postgres',
      logo: '💜',
      difficulty: 'Easy',
      steps: [
        'Go to your Heroku app dashboard at https://dashboard.heroku.com',
        'Click on your app',
        'Go to "Resources" tab',
        'Click on "Heroku Postgres" addon',
        'In the database page, click "Settings"',
        'Click "View Credentials"',
        'Copy the "URI" field',
      ],
      format: 'postgres://[username]:[password]@[host].compute.amazonaws.com:[port]/[database]',
      example: 'postgres://ucabcdefg:p1234567890abcdef@ec2-12-345-678-90.compute-1.amazonaws.com:5432/d1a2b3c4d5',
      notes: [
        'Credentials rotate periodically - use the URI directly',
        'Heroku manages SSL certificates automatically',
        'Free tier (Mini) includes 1GB storage',
      ],
    },
    {
      provider: 'DigitalOcean Managed Databases',
      logo: '🌊',
      difficulty: 'Easy',
      steps: [
        'Log in to DigitalOcean at https://cloud.digitalocean.com',
        'Go to "Databases" in the left menu',
        'Select your PostgreSQL database',
        'Click on "Connection Details"',
        'Select "Connection String" from the dropdown',
        'Copy the connection string',
      ],
      format: 'postgresql://[username]:[password]@[host]:[port]/[database]?sslmode=require',
      example: 'postgresql://doadmin:mypassword@db-postgresql-nyc1-12345-do-user-67890-0.db.ondigitalocean.com:25060/defaultdb?sslmode=require',
      notes: [
        'DigitalOcean enforces SSL by default',
        'Includes automatic backups',
        'Pricing starts at $15/month',
      ],
    },
    {
      provider: 'Render',
      logo: '🎨',
      difficulty: 'Easy',
      steps: [
        'Sign in to Render at https://dashboard.render.com',
        'Go to your PostgreSQL database',
        'Look for "Connections" section in the dashboard',
        'Find "External Database URL"',
        'Click to copy the connection string',
      ],
      format: 'postgresql://[user]:[password]@[host]/[database]',
      example: 'postgresql://mydb_user:secretpass@dpg-abc123xyz456-a.oregon-postgres.render.com/mydb_wxyz',
      notes: [
        'Internal and external URLs available',
        'Use external URL for connecting from outside Render',
        'Free tier includes 90-day database expiration',
      ],
    },
    {
      provider: 'Local PostgreSQL',
      logo: '💻',
      difficulty: 'Easy',
      steps: [
        'Ensure PostgreSQL is installed and running',
        'Default connection is: localhost:5432',
        'Use your PostgreSQL username (default: postgres)',
        'Use the password you set during installation',
        'Construct: postgresql://username:password@localhost:5432/database_name',
      ],
      format: 'postgresql://[username]:[password]@localhost:5432/[database]',
      example: 'postgresql://postgres:mypassword@localhost:5432/myapp',
      notes: [
        'Default database is "postgres"',
        'Default port is 5432',
        'No SSL required for local connections',
      ],
    },
    {
      provider: 'PlanetScale (MySQL)',
      logo: '🪐',
      difficulty: 'Easy',
      steps: [
        'Log in to PlanetScale at https://app.planetscale.com',
        'Select your database',
        'Click on "Connect" button',
        'Select "General" from connection options',
        'Copy the connection string shown',
        'Choose "MySQL" format (not MySQL2 or Prisma)',
      ],
      format: 'mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}',
      example: 'mysql://abc123xyz:pscale_pw_456def@aws.connect.psdb.cloud/mydb?ssl={"rejectUnauthorized":true}',
      notes: [
        'PlanetScale requires SSL connections',
        'Free tier includes 5GB storage and 1 billion row reads/month',
        'Supports database branching for development',
        'Connection strings are tied to specific branches',
      ],
    },
    {
      provider: 'AWS RDS MySQL',
      logo: '☁️',
      difficulty: 'Medium',
      steps: [
        'Log in to AWS Console at https://console.aws.amazon.com',
        'Navigate to RDS service',
        'Select your MySQL database instance',
        'Click on "Configuration" tab',
        'Find the "Endpoint" (host address) and "Port" (default: 3306)',
        'Construct connection string using: mysql://username:password@endpoint:port/database',
      ],
      format: 'mysql://[username]:[password]@[endpoint]:[port]/[database]',
      example: 'mysql://admin:mypassword@mydb.c9akciq32.us-east-1.rds.amazonaws.com:3306/mydatabase',
      notes: [
        'Ensure security group allows inbound traffic on port 3306',
        'Use SSL/TLS for production databases',
        'Default MySQL port is 3306',
        'Free tier includes 750 hours/month of db.t2.micro',
      ],
    },
    {
      provider: 'Local MySQL',
      logo: '💻',
      difficulty: 'Easy',
      steps: [
        'Ensure MySQL is installed and running',
        'Default connection is: localhost:3306',
        'Use your MySQL username (default: root)',
        'Use the password you set during installation',
        'Construct: mysql://username:password@localhost:3306/database_name',
      ],
      format: 'mysql://[username]:[password]@localhost:3306/[database]',
      example: 'mysql://root:mypassword@localhost:3306/myapp',
      notes: [
        'Default MySQL port is 3306',
        'Default username is "root"',
        'No SSL required for local connections',
        'Create database first: CREATE DATABASE myapp;',
      ],
    },
    {
      provider: 'DigitalOcean MySQL',
      logo: '🌊',
      difficulty: 'Easy',
      steps: [
        'Log in to DigitalOcean at https://cloud.digitalocean.com',
        'Go to "Databases" in the left menu',
        'Select your MySQL database',
        'Click on "Connection Details"',
        'Select "Connection String" from the dropdown',
        'Copy the MySQL connection string',
      ],
      format: 'mysql://[username]:[password]@[host]:[port]/[database]?ssl-mode=REQUIRED',
      example: 'mysql://doadmin:mypassword@db-mysql-nyc1-12345-do-user-67890-0.db.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED',
      notes: [
        'DigitalOcean enforces SSL for MySQL by default',
        'Includes automatic backups and high availability',
        'Pricing starts at $15/month',
        'Supports MySQL 8.0',
      ],
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Database Support:</strong> This application supports both <strong>PostgreSQL</strong> and <strong>MySQL</strong> databases.
          All providers listed below offer either PostgreSQL or MySQL-compatible databases.
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            📚 Connection String Guide
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Follow the instructions below to get your PostgreSQL connection string from various database providers.
            Connection strings are used to securely connect our application to your database.
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Security Note:</strong> Never share your connection strings publicly. They contain sensitive credentials
              that grant access to your database. All connections are encrypted and stored securely.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {guides.map((guide, index) => (
        <Accordion key={index} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography sx={{ fontSize: '2rem' }}>{guide.logo}</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">{guide.provider}</Typography>
              </Box>
              <Chip 
                label={guide.difficulty} 
                color={getDifficultyColor(guide.difficulty) as any}
                size="small"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>
                📋 Steps to Get Connection String:
              </Typography>
              <ol style={{ paddingLeft: '1.5rem' }}>
                {guide.steps.map((step, idx) => (
                  <li key={idx}>
                    <Typography variant="body2" paragraph>
                      {step}
                    </Typography>
                  </li>
                ))}
              </ol>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                📐 Connection String Format:
              </Typography>
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.875rem', overflowX: 'auto' }}>
                {guide.format}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                💡 Example:
              </Typography>
              <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.875rem', overflowX: 'auto', color: 'success.dark' }}>
                {guide.example}
              </Box>

              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                ℹ️ Important Notes:
              </Typography>
              <ul style={{ paddingLeft: '1.5rem' }}>
                {guide.notes.map((note, idx) => (
                  <li key={idx}>
                    <Typography variant="body2" color="text.secondary">
                      {note}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      <Card sx={{ mt: 3, bgcolor: 'info.50' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ❓ Frequently Asked Questions
          </Typography>
          
          <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
            Q: Does this app support MySQL, MongoDB, or other databases?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            A: Yes! The application supports both <strong>PostgreSQL</strong> and <strong>MySQL</strong> databases. This includes cloud providers like Supabase, Neon, Railway, PlanetScale, AWS RDS (both MySQL and PostgreSQL), and local installations. MongoDB and other NoSQL databases are not currently supported.
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
            Q: Is my connection string stored securely?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            A: Yes! All connection strings are encrypted using AES-256-CBC encryption before being stored in the database. Only you can access your connections.
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
            Q: Can I connect to multiple databases?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            A: Absolutely! You can add multiple database connections and switch between them. Only one connection can be active at a time.
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
            Q: What if my connection test fails?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            A: Common issues include: incorrect password, firewall blocking the connection, wrong database name, or SSL requirement. Double-check your connection string format and ensure your database allows external connections.
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
            Q: Do I need to enable SSL?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            A: Most cloud providers require SSL for security. The application automatically detects and handles SSL requirements for major providers like AWS, Heroku, and Neon.
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Need help? Check our{' '}
          <Link href="https://github.com/yourusername/tudb/wiki" target="_blank" rel="noopener">
            documentation
          </Link>
          {' '}or contact support.
        </Typography>
      </Box>
    </Box>
  );
}
