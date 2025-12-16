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
      name: 'PostgreSQL (Local)',
      logo: 'https://www.postgresql.org/media/img/about/press/elephant.png',
      color: 'blue',
      gradient: 'from-blue-50 to-blue-100',
      description: 'Open-source relational database for local development',
      connectionString: 'postgresql://username:password@localhost:5432/database',
      examples: [
        {
          title: 'Local Development',
          string: 'postgresql://postgres:password@localhost:5432/myapp'
        }
      ],
      setup: [
        {
          step: 'Install PostgreSQL',
          description: 'Download from postgresql.org or use package manager',
          commands: [
            '# macOS\nbrew install postgresql@16',
            '# Windows\nDownload installer from postgresql.org',
            '# Linux (Ubuntu)\nsudo apt-get update\nsudo apt-get install postgresql-16'
          ]
        },
        {
          step: 'Start PostgreSQL Service',
          description: 'Ensure PostgreSQL is running on your system',
          commands: [
            '# macOS\nbrew services start postgresql@16',
            '# Linux\nsudo service postgresql start',
            '# Windows\nRun: Services > PostgreSQL'
          ]
        },
        {
          step: 'Create Database',
          description: 'Create a new database for your application',
          commands: [
            'psql -U postgres\nCREATE DATABASE myapp;\n\\q'
          ]
        }
      ],
      tips: [
        'Default port is 5432',
        'Use strong passwords for production',
        'Create read-only users for query interfaces'
      ]
    },
    {
      name: 'MySQL',
      logo: 'https://labs.mysql.com/common/logos/mysql-logo.svg',
      color: 'blue',
      gradient: 'from-blue-50 to-blue-100',
      description: 'Popular open-source relational database management system',
      connectionString: 'mysql://username:password@localhost:3306/database',
      examples: [
        {
          title: 'Local MySQL',
          string: 'mysql://root:password@localhost:3306/myapp'
        },
        {
          title: 'Remote MySQL',
          string: 'mysql://user:pass@mysql-server.example.com:3306/production'
        }
      ],
      setup: [
        {
          step: 'Install MySQL',
          description: 'Download from mysql.com or use package manager',
          commands: [
            '# macOS\nbrew install mysql',
            '# Windows\nDownload installer from mysql.com',
            '# Linux (Ubuntu)\nsudo apt-get update\nsudo apt-get install mysql-server'
          ]
        },
        {
          step: 'Start MySQL Service',
          description: 'Ensure MySQL is running on your system',
          commands: [
            '# macOS\nbrew services start mysql',
            '# Linux\nsudo service mysql start',
            '# Windows\nRun: Services > MySQL'
          ]
        },
        {
          step: 'Secure Installation',
          description: 'Run the security script to set root password',
          commands: [
            'mysql_secure_installation'
          ]
        },
        {
          step: 'Create Database',
          description: 'Create a new database for your application',
          commands: [
            'mysql -u root -p\nCREATE DATABASE myapp;\nCREATE USER \'appuser\'@\'localhost\' IDENTIFIED BY \'password\';\nGRANT ALL PRIVILEGES ON myapp.* TO \'appuser\'@\'localhost\';\nFLUSH PRIVILEGES;\nexit;'
          ]
        }
      ],
      tips: [
        'Default port is 3306',
        'Use strong passwords for all users',
        'Consider using SSL for remote connections',
        'Enable binary logging for replication'
      ]
    },
    {
      name: 'Supabase',
      logo: 'data:image/svg+xml,%3Csvg width="109" height="113" viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(%23paint0_linear)"/%3E%3Cpath d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(%23paint1_linear)" fill-opacity="0.2"/%3E%3Cpath d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="%233ECF8E"/%3E%3Cdefs%3E%3ClinearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse"%3E%3Cstop stop-color="%23249361"/%3E%3Cstop offset="1" stop-color="%233ECF8E"/%3E%3C/linearGradient%3E%3ClinearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse"%3E%3Cstop/%3E%3Cstop offset="1" stop-opacity="0"/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E',
      color: 'green',
      gradient: 'from-green-50 to-green-100',
      description: 'Open source Firebase alternative with PostgreSQL',
      connectionString: 'postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres',
      examples: [
        {
          title: 'Supabase Connection',
          string: 'postgresql://postgres.ykanixtxrlnxbwxeknwb:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
        }
      ],
      setup: [
        {
          step: 'Create Project',
          description: 'Sign up at supabase.com and create a new project',
          commands: [
            'Visit: https://supabase.com/dashboard\nClick: New Project'
          ]
        },
        {
          step: 'Get Connection String',
          description: 'Navigate to Project Settings > Database',
          commands: [
            'Copy: Session Pooler connection string\n(Use port 5432 for IPv4 compatibility)'
          ]
        },
        {
          step: 'Configure Connection',
          description: 'Use Session Pooler for better compatibility',
          commands: [
            'Format:\npostgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres'
          ]
        }
      ],
      tips: [
        'Always use Session Pooler (port 5432)',
        'Direct Connection (port 6543) may have IPv6 issues',
        'Free tier includes 500MB database',
        'Built-in Auth and Storage'
      ]
    },
    {
      name: 'Neon',
      logo: 'data:image/svg+xml,%3Csvg width="158" height="45" viewBox="0 0 158 45" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath fill-rule="evenodd" clip-rule="evenodd" d="M0 7.61152C0 3.40779 3.44137 0 7.68651 0H36.8952C41.1404 0 44.5817 3.40779 44.5817 7.61152V32.2111C44.5817 36.5601 39.0241 38.4476 36.3287 35.014L27.902 24.2798V37.2964C27.902 41.0798 24.8048 44.1468 20.9842 44.1468H7.68651C3.44137 44.1468 0 40.739 0 36.5353V7.61152ZM7.68651 6.08921C6.83748 6.08921 6.14921 6.77077 6.14921 7.61152V36.5353C6.14921 37.376 6.83748 38.0576 7.68651 38.0576H21.2148C21.6393 38.0576 21.7528 37.7168 21.7528 37.2964V19.8412C21.7528 15.4922 27.3104 13.6047 30.0059 17.0383L38.4325 27.7725V7.61152C38.4325 6.77077 38.5129 6.08921 37.6639 6.08921H7.68651Z" fill="%23191919"/%3E%3Cpath d="M36.8954 0C41.1406 0 44.5819 3.40779 44.5819 7.61152V32.2111C44.5819 36.5601 39.0243 38.4476 36.3289 35.014L27.9022 24.2798V37.2964C27.9022 41.0798 24.805 44.1468 20.9844 44.1468C21.4089 44.1468 21.753 43.806 21.753 43.3857V19.8412C21.753 15.4922 27.3106 13.6047 30.0061 17.0383L38.4327 27.7725V1.5223C38.4327 0.681558 37.7445 0 36.8954 0Z" fill="%23191919"/%3E%3Cpath d="M75.1561 13.0033V24.5502L63.8496 13.0033H57.9648V31.8884H63.332V19.4782L75.6465 31.8884H80.5232V13.0033H75.1561Z" fill="%231A1A1A"/%3E%3Cpath d="M90.4725 27.6797V24.3343H102.487V20.3145H90.4725V17.212H105.048V13.0033H84.9964V31.8884H105.348V27.6797H90.4725Z" fill="%231A1A1A"/%3E%3Cpath d="M119.61 32.5089C127.157 32.5089 132.061 28.8398 132.061 22.4458C132.061 16.0519 127.157 12.3828 119.61 12.3828C112.063 12.3828 107.187 16.0519 107.187 22.4458C107.187 28.8398 112.063 32.5089 119.61 32.5089ZM119.61 28.0304C115.415 28.0304 112.826 26.007 112.826 22.4458C112.826 18.8847 115.442 16.8613 119.61 16.8613C123.806 16.8613 126.394 18.8847 126.394 22.4458C126.394 26.007 123.806 28.0304 119.61 28.0304Z" fill="%231A1A1A"/%3E%3Cpath d="M152.632 13.0033V24.5502L141.326 13.0033H135.441V31.8884H140.808V19.4782L153.123 31.8884H157.999V13.0033H152.632Z" fill="%231A1A1A"/%3E%3C/svg%3E',
      color: 'emerald',
      gradient: 'from-emerald-50 to-emerald-100',
      description: 'Serverless PostgreSQL with branching',
      connectionString: 'postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]',
      examples: [
        {
          title: 'Neon Connection',
          string: 'postgresql://user:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb'
        }
      ],
      setup: [
        {
          step: 'Create Account',
          description: 'Sign up at neon.tech',
          commands: [
            'Visit: https://neon.tech\nClick: Sign Up'
          ]
        },
        {
          step: 'Create Project',
          description: 'Create a new project in your dashboard',
          commands: [
            'Dashboard > New Project\nSelect: Region and PostgreSQL version'
          ]
        },
        {
          step: 'Get Connection String',
          description: 'Copy from project dashboard',
          commands: [
            'Dashboard > Connection Details\nCopy: Connection String'
          ]
        }
      ],
      tips: [
        'Generous free tier with autoscaling',
        'Database branching for dev/test',
        'Automatic backups',
        'Scale to zero when inactive'
      ]
    },
    {
      name: 'Railway',
      logo: 'https://railway.com/brand/logo-dark.svg',
      color: 'purple',
      gradient: 'from-purple-50 to-purple-100',
      description: 'Deploy PostgreSQL with one click',
      connectionString: 'postgresql://postgres:[password]@[host].railway.app:[port]/railway',
      examples: [
        {
          title: 'Railway Connection',
          string: 'postgresql://postgres:password@containers-us-west-12.railway.app:5432/railway'
        }
      ],
      setup: [
        {
          step: 'Create Account',
          description: 'Sign up at railway.app with GitHub',
          commands: [
            'Visit: https://railway.app\nClick: Login with GitHub'
          ]
        },
        {
          step: 'Create PostgreSQL Database',
          description: 'Add PostgreSQL to your project',
          commands: [
            'New Project > Add PostgreSQL\nWait for deployment'
          ]
        },
        {
          step: 'Get Connection String',
          description: 'Available in database settings',
          commands: [
            'Database > Connect Tab\nCopy: Postgres Connection URL'
          ]
        }
      ],
      tips: [
        '$5 free credit monthly',
        'Automatic SSL connections',
        'Built-in monitoring',
        'Easy environment variables'
      ]
    },
    {
      name: 'AWS RDS',
      logo: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
      color: 'orange',
      gradient: 'from-orange-50 to-orange-100',
      description: 'Managed PostgreSQL on AWS',
      connectionString: 'postgresql://[user]:[password]@[endpoint].rds.amazonaws.com:5432/[dbname]',
      examples: [
        {
          title: 'AWS RDS Connection',
          string: 'postgresql://admin:password@mydb.c9akciq32.us-east-1.rds.amazonaws.com:5432/production'
        }
      ],
      setup: [
        {
          step: 'Create RDS Instance',
          description: 'Navigate to AWS RDS console',
          commands: [
            'AWS Console > RDS > Create Database\nSelect: PostgreSQL\nChoose: Free tier (or production)'
          ]
        },
        {
          step: 'Configure Security Group',
          description: 'Allow inbound connections',
          commands: [
            'RDS > Security Groups\nAdd Inbound Rule: PostgreSQL (5432)\nSource: Your IP or 0.0.0.0/0 (less secure)'
          ]
        },
        {
          step: 'Get Endpoint',
          description: 'Copy endpoint from RDS details',
          commands: [
            'RDS > Databases > [Your DB]\nCopy: Endpoint & Port'
          ]
        }
      ],
      tips: [
        'Free tier: 750 hours/month for 12 months',
        'Automated backups and snapshots',
        'Multi-AZ for high availability',
        'Monitor with CloudWatch'
      ]
    }
  ];

  const [selectedDatabase, setSelectedDatabase] = useState(0);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Database Setup Guide</h1>
          <p className="text-lg text-gray-600">
            Connect to PostgreSQL from any provider
          </p>
        </div>

        {/* Database Provider Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {databases.map((db, index) => (
            <button
              key={db.name}
              onClick={() => setSelectedDatabase(index)}
              className={`p-6 rounded-2xl border-2 transition-all text-left ${
                selectedDatabase === index
                  ? 'border-[#007AFF] bg-white shadow-lg scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <img src={db.logo} alt={db.name} className="w-12 h-12 object-contain" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{db.name}</h3>
                </div>
              </div>
              <p className="text-sm text-gray-600">{db.description}</p>
            </button>
          ))}
        </div>

        {/* Selected Database Details */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={`p-6 bg-gradient-to-r ${databases[selectedDatabase].gradient}`}>
            <div className="flex items-center gap-4">
              <img src={databases[selectedDatabase].logo} alt={databases[selectedDatabase].name} className="w-16 h-16 object-contain bg-white rounded-xl p-2" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{databases[selectedDatabase].name}</h2>
                <p className="text-gray-700">{databases[selectedDatabase].description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Connection String Format */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Connection String Format
              </h3>
              <div className="bg-gray-100 rounded-xl p-4 font-mono text-sm text-gray-800 break-all">
                {databases[selectedDatabase].connectionString}
              </div>
            </div>

            {/* Examples */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Examples</h3>
              <div className="space-y-3">
                {databases[selectedDatabase].examples.map((example, idx) => (
                  <div key={idx} className="relative">
                    <div className="text-sm font-medium text-gray-700 mb-2">{example.title}</div>
                    <div className="bg-white border border-gray-300 rounded-xl p-4 pr-12 relative group shadow-inner">
                      <code className="text-sm text-[#111111] break-all">{example.string}</code>
                      <button
                        onClick={() => handleCopy(example.string, idx)}
                        className="absolute right-3 top-3 p-2 rounded-lg bg-[#F5F5F7] border border-gray-300 hover:bg-[#E5E5E7] transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-4 h-4 text-[#007AFF]" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#86868B]" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup Steps */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Server className="w-5 h-5" />
                Setup Steps
              </h3>
              <div className="space-y-4">
                {databases[selectedDatabase].setup.map((step, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-7 h-7 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{step.step}</h4>
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2 ml-10">
                      {step.commands.map((cmd, cmdIdx) => (
                        <div key={cmdIdx} className="bg-white border border-gray-300 rounded-lg p-3 relative group shadow-inner">
                          <pre className="text-sm text-[#111111] whitespace-pre-wrap">{cmd}</pre>
                          <button
                            onClick={() => handleCopy(cmd, 1000 + idx * 10 + cmdIdx)}
                            className="absolute right-2 top-2 p-1.5 rounded bg-[#F5F5F7] border border-gray-300 hover:bg-[#E5E5E7] transition-colors opacity-0 group-hover:opacity-100"
                          >
                            {copiedIndex === 1000 + idx * 10 + cmdIdx ? (
                              <Check className="w-3.5 h-3.5 text-[#007AFF]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-[#86868B]" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Best Practices & Tips
              </h3>
              <div className="grid gap-3">
                {databases[selectedDatabase].tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
