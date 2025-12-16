import { useState } from 'react';
import { ChevronRight, Copy, Check, ExternalLink, AlertCircle, Shield, Database, Server } from 'lucide-react';

export default function SetupGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const databases = [
    {
      name: 'PostgreSQL',
      icon: '🐘',
      color: 'blue',
      gradient: 'from-blue-50 to-blue-100',
      description: 'Open-source relational database with advanced features',
      connectionString: 'postgresql://username:password@host:5432/database',
      examples: [
        {
          title: 'Local Development',
          string: 'postgresql://postgres:password@localhost:5432/myapp'
        },
        {
          title: 'Cloud Hosted (AWS RDS)',
          string: 'postgresql://admin:securepass@mydb.c9akciq32.us-east-1.rds.amazonaws.com:5432/production'
        },
        {
          title: 'Heroku Postgres',
          string: 'postgres://user:pass@ec2-host.compute-1.amazonaws.com:5432/dbname'
        }
      ],
      setup: [
        {
          step: 'Install PostgreSQL',
          description: 'Download from postgresql.org or use Homebrew/apt-get',
          commands: [
            '# macOS\nbrew install postgresql',
            '# Ubuntu\nsudo apt-get install postgresql',
            '# Windows\nDownload installer from postgresql.org'
          ]
        },
        {
          step: 'Start PostgreSQL Service',
          description: 'Ensure PostgreSQL is running on your system',
          commands: [
            '# macOS\nbrew services start postgresql',
            '# Ubuntu\nsudo service postgresql start',
            '# Windows\nNet start postgresql-x64-14'
          ]
        },
        {
          step: 'Create Database',
          description: 'Create a new database for your application',
          commands: [
            'psql -U postgres\nCREATE DATABASE myapp;\n\\q'
          ]
        },
        {
          step: 'Get Connection String',
          description: 'Format: postgresql://[user]:[password]@[host]:[port]/[database]',
          commands: [
            'postgresql://postgres:yourpassword@localhost:5432/myapp'
          ]
        }
      ],
      tips: [
        'Default port is 5432',
        'Use strong passwords for production',
        'Enable SSL/TLS for remote connections',
        'Create read-only users for query interfaces',
        'Regular backups with pg_dump'
      ]
    },
    {
      name: 'MySQL',
      icon: '🐬',
      color: 'orange',
      gradient: 'from-orange-50 to-orange-100',
      description: 'Popular open-source relational database management system',
      connectionString: 'mysql://username:password@host:3306/database',
      examples: [
        {
          title: 'Local Development',
          string: 'mysql://root:password@localhost:3306/myapp'
        },
        {
          title: 'Cloud Hosted (AWS RDS)',
          string: 'mysql://admin:securepass@mysql-instance.c9akciq32.us-east-1.rds.amazonaws.com:3306/production'
        },
        {
          title: 'DigitalOcean Managed MySQL',
          string: 'mysql://doadmin:password@mysql-do-user-123456-0.db.ondigitalocean.com:25060/defaultdb'
        }
      ],
      setup: [
        {
          step: 'Install MySQL',
          description: 'Download from mysql.com or use package manager',
          commands: [
            '# macOS\nbrew install mysql',
            '# Ubuntu\nsudo apt-get install mysql-server',
            '# Windows\nDownload installer from mysql.com'
          ]
        },
        {
          step: 'Start MySQL Service',
          description: 'Start the MySQL server',
          commands: [
            '# macOS\nbrew services start mysql',
            '# Ubuntu\nsudo service mysql start',
            '# Windows\nNet start MySQL80'
          ]
        },
        {
          step: 'Secure Installation',
          description: 'Run security script to set root password',
          commands: [
            'mysql_secure_installation'
          ]
        },
        {
          step: 'Create Database',
          description: 'Create a new database for your application',
          commands: [
            'mysql -u root -p\nCREATE DATABASE myapp;\nEXIT;'
          ]
        }
      ],
      tips: [
        'Default port is 3306',
        'Use mysql_secure_installation for production',
        'Enable binary logging for replication',
        'Configure max_connections appropriately',
        'Regular backups with mysqldump'
      ]
    },
    {
      name: 'Snowflake',
      icon: '❄️',
      color: 'cyan',
      gradient: 'from-cyan-50 to-cyan-100',
      description: 'Cloud-based data warehousing platform',
      connectionString: 'snowflake://username:password@account.region/database?warehouse=WH&schema=PUBLIC',
      examples: [
        {
          title: 'Standard Connection',
          string: 'snowflake://myuser:password@xy12345.us-east-1/ANALYTICS?warehouse=COMPUTE_WH'
        },
        {
          title: 'With Role and Schema',
          string: 'snowflake://myuser:password@xy12345.us-east-1/PROD_DB?warehouse=ETL_WH&role=ANALYST&schema=PUBLIC'
        },
        {
          title: 'Multi-Region',
          string: 'snowflake://admin:password@company.eu-central-1/DATA_WAREHOUSE?warehouse=REPORTING_WH'
        }
      ],
      setup: [
        {
          step: 'Create Snowflake Account',
          description: 'Sign up at snowflake.com for a trial account',
          commands: [
            'Visit: https://signup.snowflake.com'
          ]
        },
        {
          step: 'Note Your Account Identifier',
          description: 'Format: [account].[region]',
          commands: [
            'Example: xy12345.us-east-1\nFound in: Account > Account Info'
          ]
        },
        {
          step: 'Create Virtual Warehouse',
          description: 'Required for running queries',
          commands: [
            'CREATE WAREHOUSE COMPUTE_WH WITH\n  WAREHOUSE_SIZE = XSMALL\n  AUTO_SUSPEND = 300\n  AUTO_RESUME = TRUE;'
          ]
        },
        {
          step: 'Create Database and Schema',
          description: 'Set up your data structure',
          commands: [
            'CREATE DATABASE ANALYTICS;\nUSE DATABASE ANALYTICS;\nCREATE SCHEMA PUBLIC;'
          ]
        },
        {
          step: 'Create User with Permissions',
          description: 'Create a dedicated user for your application',
          commands: [
            'CREATE USER myapp_user\n  PASSWORD = \'StrongPassword123!\'\n  DEFAULT_WAREHOUSE = COMPUTE_WH;\n\nGRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE PUBLIC;\nGRANT ROLE PUBLIC TO USER myapp_user;'
          ]
        }
      ],
      tips: [
        'Warehouses auto-suspend to save costs',
        'Start with XSMALL warehouse size',
        'Use separate warehouses for different workloads',
        'Enable multi-factor authentication',
        'Monitor credit usage regularly'
      ]
    },
    {
      name: 'MongoDB',
      icon: '🍃',
      color: 'green',
      gradient: 'from-green-50 to-green-100',
      description: 'NoSQL document database for flexible data structures',
      connectionString: 'mongodb://username:password@host:27017/database',
      examples: [
        {
          title: 'Local Development',
          string: 'mongodb://localhost:27017/myapp'
        },
        {
          title: 'MongoDB Atlas (Cloud)',
          string: 'mongodb+srv://myuser:password@cluster0.mongodb.net/production?retryWrites=true&w=majority'
        },
        {
          title: 'Replica Set',
          string: 'mongodb://user:pass@node1:27017,node2:27017,node3:27017/mydb?replicaSet=rs0'
        }
      ],
      setup: [
        {
          step: 'Install MongoDB',
          description: 'Download from mongodb.com or use package manager',
          commands: [
            '# macOS\nbrew tap mongodb/brew\nbrew install mongodb-community',
            '# Ubuntu\nsudo apt-get install mongodb-org',
            '# Windows\nDownload MSI installer from mongodb.com'
          ]
        },
        {
          step: 'Start MongoDB Service',
          description: 'Start the MongoDB server',
          commands: [
            '# macOS\nbrew services start mongodb-community',
            '# Ubuntu\nsudo systemctl start mongod',
            '# Windows\nNet start MongoDB'
          ]
        },
        {
          step: 'Create Database and User',
          description: 'Set up authentication',
          commands: [
            'mongosh\nuse myapp\ndb.createUser({\n  user: "myappuser",\n  pwd: "securepassword",\n  roles: [{ role: "readWrite", db: "myapp" }]\n})'
          ]
        },
        {
          step: 'Enable Authentication (Production)',
          description: 'Edit mongod.conf',
          commands: [
            'security:\n  authorization: enabled'
          ]
        }
      ],
      tips: [
        'Default port is 27017',
        'Use MongoDB Atlas for managed hosting',
        'Enable authentication in production',
        'Create indexes for frequently queried fields',
        'Use mongodump for backups'
      ]
    },
    {
      name: 'Microsoft SQL Server',
      icon: '🗄️',
      color: 'red',
      gradient: 'from-red-50 to-red-100',
      description: 'Enterprise relational database from Microsoft',
      connectionString: 'mssql://username:password@host:1433/database',
      examples: [
        {
          title: 'Windows Authentication',
          string: 'mssql://localhost:1433/myapp?trustedConnection=true'
        },
        {
          title: 'SQL Authentication',
          string: 'mssql://sa:YourPassword123@localhost:1433/myapp'
        },
        {
          title: 'Azure SQL Database',
          string: 'mssql://myuser:password@myserver.database.windows.net:1433/mydb?encrypt=true'
        }
      ],
      setup: [
        {
          step: 'Install SQL Server',
          description: 'Download SQL Server Express (free) or Developer Edition',
          commands: [
            'Download from:\nhttps://www.microsoft.com/sql-server/sql-server-downloads'
          ]
        },
        {
          step: 'Install SQL Server Management Studio (SSMS)',
          description: 'GUI tool for managing SQL Server',
          commands: [
            'Download from:\nhttps://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms'
          ]
        },
        {
          step: 'Enable TCP/IP',
          description: 'Enable network connections',
          commands: [
            '1. Open SQL Server Configuration Manager\n2. SQL Server Network Configuration\n3. Protocols for [Instance]\n4. Enable TCP/IP\n5. Restart SQL Server'
          ]
        },
        {
          step: 'Create Database',
          description: 'Using SSMS or T-SQL',
          commands: [
            'CREATE DATABASE myapp;\nGO'
          ]
        }
      ],
      tips: [
        'Default port is 1433',
        'Use Windows Authentication when possible',
        'Enable TLS encryption for Azure SQL',
        'Regular backups with BACKUP DATABASE',
        'Monitor with SQL Server Profiler'
      ]
    },
    {
      name: 'Supabase',
      icon: '🟢',
      color: 'emerald',
      gradient: 'from-emerald-50 to-emerald-100',
      description: 'Open-source Firebase alternative with PostgreSQL',
      connectionString: 'postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres',
      examples: [
        {
          title: 'Direct Connection',
          string: 'postgresql://postgres:password@db.xyzcompany.supabase.co:5432/postgres'
        },
        {
          title: 'Connection Pooler (Recommended)',
          string: 'postgresql://postgres:password@db.xyzcompany.supabase.co:6543/postgres?pgbouncer=true'
        }
      ],
      setup: [
        {
          step: 'Create Supabase Project',
          description: 'Sign up and create a new project',
          commands: [
            'Visit: https://supabase.com\nClick: New Project\nSet database password'
          ]
        },
        {
          step: 'Get Connection String',
          description: 'Find in Project Settings',
          commands: [
            '1. Go to Project Settings\n2. Database\n3. Connection String\n4. Copy URI'
          ]
        },
        {
          step: 'Use Connection Pooler',
          description: 'For serverless environments',
          commands: [
            'Port 6543 with ?pgbouncer=true\nBetter for high connection counts'
          ]
        }
      ],
      tips: [
        'Free tier includes 500MB database',
        'Use connection pooler for serverless',
        'Built-in Row Level Security (RLS)',
        'Automatic API generation',
        'Real-time subscriptions available'
      ]
    }
  ];

  const [selectedDb, setSelectedDb] = useState(databases[0]);

  return (
    <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-[#F5F5F7]">
      <div className="p-8 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span>Documentation</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#111111] font-medium">Setup Guide</span>
          </div>
          <h1 className="text-4xl font-bold text-[#111111] tracking-tight mb-3">
            Database Connection Setup Guide
          </h1>
          <p className="text-[#86868B] text-[17px] max-w-3xl">
            Complete step-by-step instructions for connecting your databases. Perfect for beginners getting started with TUDB.
          </p>
        </div>

        {/* Quick Start Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 flex gap-4">
          <AlertCircle className="w-6 h-6 text-[#007AFF] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-[#111111] mb-2">Quick Start Tips</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Start with a <strong>local database</strong> for testing</li>
              <li>• Always use <strong>read-only credentials</strong> when possible</li>
              <li>• Enable <strong>SSL/TLS encryption</strong> for production connections</li>
              <li>• Test your connection string before saving</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Database Selection Sidebar */}
          <div className="xl:col-span-1">
            <div className="sticky top-8 space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-3 mb-4">Select Database</h2>
              {databases.map((db) => (
                <button
                  key={db.name}
                  onClick={() => setSelectedDb(db)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                    selectedDb.name === db.name
                      ? `bg-gradient-to-r ${db.gradient} shadow-lg border-2 border-${db.color}-300`
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <span className="text-3xl">{db.icon}</span>
                  <div className="text-left flex-1">
                    <div className={`font-bold text-sm ${selectedDb.name === db.name ? 'text-[#111111]' : 'text-gray-700'}`}>
                      {db.name}
                    </div>
                  </div>
                  {selectedDb.name === db.name && (
                    <Check className="w-5 h-5 text-[#007AFF]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            {/* Database Overview */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-start gap-4 mb-6">
                <div className={`size-16 rounded-2xl bg-gradient-to-br ${selectedDb.gradient} flex items-center justify-center text-4xl shadow-inner`}>
                  {selectedDb.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#111111] mb-2">{selectedDb.name}</h2>
                  <p className="text-gray-600">{selectedDb.description}</p>
                </div>
              </div>

              {/* Connection String Format */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-[#007AFF]" />
                  <h3 className="font-bold text-[#111111] text-sm">Connection String Format</h3>
                </div>
                <div className="bg-[#1D1D1F] rounded-lg p-4 relative group">
                  <code className="text-green-400 text-sm font-mono break-all">
                    {selectedDb.connectionString}
                  </code>
                  <button
                    onClick={() => handleCopy(selectedDb.connectionString, -1)}
                    className="absolute top-3 right-3 size-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedIndex === -1 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Server className="w-6 h-6 text-[#007AFF]" />
                <h2 className="text-xl font-bold text-[#111111]">Connection Examples</h2>
              </div>
              <div className="space-y-4">
                {selectedDb.examples.map((example, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-[#111111] mb-3">{example.title}</h3>
                    <div className="bg-[#1D1D1F] rounded-lg p-4 relative group">
                      <code className="text-green-400 text-sm font-mono break-all">
                        {example.string}
                      </code>
                      <button
                        onClick={() => handleCopy(example.string, idx)}
                        className="absolute top-3 right-3 size-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedIndex === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup Steps */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h2 className="text-xl font-bold text-[#111111] mb-6">Step-by-Step Setup</h2>
              <div className="space-y-6">
                {selectedDb.setup.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="size-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#111111] mb-2">{step.step}</h3>
                      <p className="text-gray-600 text-sm mb-3">{step.description}</p>
                      <div className="space-y-2">
                        {step.commands.map((cmd, cmdIdx) => (
                          <div key={cmdIdx} className="bg-[#1D1D1F] rounded-lg p-4 relative group">
                            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap break-all">
                              {cmd}
                            </pre>
                            <button
                              onClick={() => handleCopy(cmd, idx * 100 + cmdIdx)}
                              className="absolute top-3 right-3 size-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {copiedIndex === idx * 100 + cmdIdx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Practices */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-6 h-6 text-[#007AFF]" />
                <h2 className="text-xl font-bold text-[#111111]">Best Practices & Tips</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDb.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Recommendations */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-red-600 flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-[#111111] mb-4">Security Recommendations</h2>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0"></div>
                      <div>
                        <strong className="text-[#111111]">Never commit credentials to git</strong>
                        <p className="text-sm text-gray-700">Use environment variables or secrets management</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0"></div>
                      <div>
                        <strong className="text-[#111111]">Use read-only database users</strong>
                        <p className="text-sm text-gray-700">Limit permissions to SELECT only for query interfaces</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0"></div>
                      <div>
                        <strong className="text-[#111111]">Enable SSL/TLS encryption</strong>
                        <p className="text-sm text-gray-700">Always use encrypted connections in production</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0"></div>
                      <div>
                        <strong className="text-[#111111]">Whitelist IP addresses</strong>
                        <p className="text-sm text-gray-700">Restrict database access to known IP ranges</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0"></div>
                      <div>
                        <strong className="text-[#111111]">Rotate credentials regularly</strong>
                        <p className="text-sm text-gray-700">Update passwords every 90 days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-[#111111] mb-3">Need More Help?</h2>
              <p className="text-gray-600 mb-6">
                Check out the official documentation for detailed information
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a
                  href="https://www.postgresql.org/docs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-[#111111] hover:bg-gray-50 transition-colors shadow-sm"
                >
                  PostgreSQL Docs
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://dev.mysql.com/doc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-[#111111] hover:bg-gray-50 transition-colors shadow-sm"
                >
                  MySQL Docs
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://docs.snowflake.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-[#111111] hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Snowflake Docs
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href="https://www.mongodb.com/docs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-full text-sm font-medium text-[#111111] hover:bg-gray-50 transition-colors shadow-sm"
                >
                  MongoDB Docs
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
