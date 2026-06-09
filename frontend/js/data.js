/* ============================================================
   InterviewAI — Static Data & RAG Bank  (js/data.js)
   ============================================================ */

const JOB_ROLES = [
    'Data Scientist', 'AI Engineer', 'Full Stack Developer', 'Java Developer',
    'ML Engineer', 'Backend Developer', 'DevOps Engineer', 'Cybersecurity Analyst'
];

// Expose on state for backward-compat
state.jobRoles = JOB_ROLES;

const QUESTION_BANK = {
    'Data Scientist': {
        easy: [
            {
                text: 'What is the difference between supervised and unsupervised learning?',
                ideal: 'Supervised learning uses labeled training data to learn mapping from inputs to outputs (e.g., classification, regression). Unsupervised learning finds hidden structures or patterns in unlabeled data (e.g., clustering like K-Means, dimensionality reduction like PCA).',
                concepts: ['labeled data', 'unlabeled data', 'classification', 'clustering', 'regression']
            },
            {
                text: 'Explain what a p-value is in statistics.',
                ideal: 'A p-value is the probability of obtaining test results at least as extreme as the observed results, assuming the null hypothesis is true. A low p-value (typically < 0.05) indicates statistical significance, leading to rejecting the null hypothesis.',
                concepts: ['probability', 'null hypothesis', 'statistical significance', 'alpha level']
            },
            {
                text: 'What is cross-validation and why is it important?',
                ideal: 'Cross-validation is a resampling technique that partitions data into folds, training on some folds and validating on others (e.g. K-Fold). It helps evaluate how a model generalizes to unseen data and prevents overfitting.',
                concepts: ['k-fold', 'generalization', 'overfitting', 'validation fold']
            }
        ],
        medium: [
            {
                text: 'How would you handle imbalanced datasets?',
                ideal: 'Imbalanced datasets can be handled using resampling methods like SMOTE (synthetic oversampling) or undersampling, adjusting class weights in the loss function, using tree-based ensemble algorithms, or shifting evaluation metrics from Accuracy to F1-Score and Precision-Recall AUC.',
                concepts: ['SMOTE', 'class weights', 'oversampling', 'undersampling', 'F1-score', 'precision-recall']
            },
            {
                text: 'Explain the bias-variance tradeoff.',
                ideal: 'Bias represents the error from simple assumptions in the model (leads to underfitting). Variance represents sensitivity to noise and fluctuations in the training set (leads to overfitting). The tradeoff involves tuning model complexity to minimize both errors for generalization.',
                concepts: ['bias', 'variance', 'underfitting', 'overfitting', 'complexity', 'generalization']
            },
            {
                text: 'What is regularization and how does L1 differ from L2?',
                ideal: 'Regularization prevents overfitting by adding a penalty to the loss function. L1 (Lasso) adds absolute weights and leads to sparse models (weights become exactly 0), acting as feature selection. L2 (Ridge) adds squared weights and shrinks weights near zero but not exactly zero.',
                concepts: ['Lasso', 'Ridge', 'penalty term', 'sparsity', 'weights', 'overfitting']
            }
        ],
        hard: [
            {
                text: 'Describe how you would deploy a machine learning model to production.',
                ideal: 'Deploying a model involves wrapping it in an API framework like FastAPI, packaging it inside Docker containers, orchestrating using Kubernetes, hosting on AWS or cloud engines, setting up continuous CI/CD pipelines, and integrating tools to monitor performance and data drift.',
                concepts: ['FastAPI', 'Docker', 'Kubernetes', 'monitoring', 'data drift', 'CI/CD']
            },
            {
                text: 'Explain the difference between bagging and boosting with examples.',
                ideal: 'Bagging trains models in parallel on bootstrapped subsets, reducing variance (e.g. Random Forest). Boosting trains models sequentially, where each model focuses on minimizing errors of the previous models, reducing bias (e.g. XGBoost, AdaBoost).',
                concepts: ['parallel', 'sequential', 'Random Forest', 'XGBoost', 'variance', 'bias']
            },
            {
                text: 'How would you design an A/B test for a recommendation system?',
                ideal: 'A/B testing involves defining hypotheses, selecting metrics like click-through rate (CTR), performing power analysis to find sample size, dividing users randomly into control and treatment groups, running the test, and calculating statistical significance (p-value).',
                concepts: ['hypothesis', 'CTR', 'sample size', 'control group', 'treatment group', 'p-value']
            }
        ]
    },
    'AI Engineer': {
        easy: [
            {
                text: 'What is the difference between AI, ML, and Deep Learning?',
                ideal: 'AI is the broad field of creating systems that simulate human intelligence. ML is a subset of AI that uses statistics to let algorithms learn patterns from data. Deep Learning is a subset of ML based on multi-layer artificial neural networks.',
                concepts: ['Artificial Intelligence', 'Machine Learning', 'neural networks', 'data patterns']
            },
            {
                text: 'Explain what a neural network is in simple terms.',
                ideal: 'A neural network is a computational model inspired by the brain. It has layers of connected nodes (neurons) that process inputs using weights, biases, and activation functions, adjusting weights during training via backpropagation.',
                concepts: ['neurons', 'weights', 'biases', 'activation function', 'backpropagation']
            },
            {
                text: 'What is transfer learning?',
                ideal: 'Transfer learning involves taking a model trained on a large dataset (e.g., ImageNet, BERT) and fine-tuning it on a smaller, task-specific dataset. This saves training time and works well with limited data.',
                concepts: ['pre-trained model', 'fine-tuning', 'ImageNet', 'data scarcity']
            }
        ],
        medium: [
            {
                text: 'How do transformers differ from traditional RNNs?',
                ideal: 'Transformers use self-attention to process input sequences in parallel, capturing long-range relationships efficiently. RNNs process tokens sequentially, making them slower and prone to vanishing/exploding gradients.',
                concepts: ['self-attention', 'parallel processing', 'sequential', 'vanishing gradient']
            },
            {
                text: 'Explain the attention mechanism in deep learning.',
                ideal: 'The attention mechanism lets a network focus on specific, relevant parts of an input sequence. Self-attention uses Query, Key, and Value vectors to compute dynamic weights that relate tokens to each other.',
                concepts: ['Query Key Value', 'softmax weights', 'context vector', 'relevance']
            },
            {
                text: 'What is overfitting and how can you prevent it in deep learning?',
                ideal: 'Overfitting occurs when a neural network learns the training noise, failing to generalize. It can be prevented using dropout layers, L1/L2 regularization, early stopping, batch normalization, and data augmentation.',
                concepts: ['dropout', 'regularization', 'early stopping', 'generalization', 'data augmentation']
            }
        ],
        hard: [
            {
                text: 'Design a system for real-time object detection on edge devices.',
                ideal: 'This requires a lightweight model (e.g. YOLOv8-nano, MobileNet), model quantization (INT8), compiler acceleration (TensorRT, ONNX Runtime), running on hardware like Jetson Nano, and balancing frame rates through downscaling.',
                concepts: ['YOLOv8', 'quantization', 'TensorRT', 'Jetson Nano', 'latency', 'edge device']
            },
            {
                text: 'Explain how you would fine-tune a large language model for a specific domain.',
                ideal: 'Fine-tuning requires domain-specific instructions, utilizing Parameter-Efficient Fine-Tuning (PEFT) like LoRA or QLoRA to save memory, optimizing hyper-parameters, and validating output using metrics like perplexity and custom benchmarks.',
                concepts: ['LoRA', 'QLoRA', 'PEFT', 'perplexity', 'hyper-parameters', 'instruction tuning']
            },
            {
                text: 'What are the challenges of deploying LLMs in production?',
                ideal: 'Key challenges include high GPU inference costs, latency (Time to First Token), hosting constraints, prompt injections, safety filtering, and orchestrating flows using frameworks like LangChain or LangGraph.',
                concepts: ['GPU cost', 'latency', 'TTFT', 'LangChain', 'LangGraph', 'hallucinations', 'safety']
            }
        ]
    },
    'Full Stack Developer': {
        easy: [
            {
                text: 'What is the difference between REST and GraphQL?',
                ideal: 'REST uses standardized endpoints mapping to resources (GET, POST, etc.) and can suffer from over/under-fetching. GraphQL uses a single endpoint allowing clients to query exact fields they need via schemas.',
                concepts: ['endpoints', 'query language', 'schema', 'over-fetching', 'under-fetching']
            },
            {
                text: 'Explain the MVC architecture.',
                ideal: 'MVC stands for Model (data structure and database logic), View (UI layout and templates), and Controller (handles inputs and contains business logic that coordinates Model and View).',
                concepts: ['Model', 'View', 'Controller', 'separation of concerns']
            },
            {
                text: 'What is CORS and why does it exist?',
                ideal: 'CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts web applications from making requests to a domain different from the one that served the page, unless the server explicitly allows it via response headers.',
                concepts: ['headers', 'browser security', 'origins', 'preflight request']
            }
        ],
        medium: [
            {
                text: 'How do you optimize database queries?',
                ideal: 'Optimization is done by creating database indexes, avoiding N+1 queries using eager loading, caching results in Redis, normalizing schemas, selecting only required columns, and analyzing query paths using EXPLAIN.',
                concepts: ['indexing', 'N+1 query', 'eager loading', 'caching', 'Redis', 'EXPLAIN']
            },
            {
                text: 'Explain the difference between authentication and authorization.',
                ideal: 'Authentication is verifying who the user is (e.g. login, passwords, tokens). Authorization is verifying what the user is allowed to do (e.g., RBAC, permissions, admin controls).',
                concepts: ['authentication', 'authorization', 'RBAC', 'tokens', 'permissions']
            },
            {
                text: 'How would you implement real-time updates in a web application?',
                ideal: 'Real-time updates can be done using WebSockets for bi-directional persistent connections, Server-Sent Events (SSE) for one-way server streaming, or short/long polling as fallback mechanisms.',
                concepts: ['WebSockets', 'Server-Sent Events', 'polling', 'persistent connection']
            }
        ],
        hard: [
            {
                text: 'Design a scalable microservices architecture for an e-commerce platform.',
                ideal: 'Requires breaking services by domain (Auth, Cart, Orders, Inventory), placing an API Gateway at entry, utilizing Docker & Kubernetes, communicating asynchronously via message brokers (Kafka/RabbitMQ), and using centralized logs.',
                concepts: ['API Gateway', 'Kafka', 'Docker/Kubernetes', 'asynchronous', 'centralized logging', 'database-per-service']
            },
            {
                text: 'How do you handle distributed transactions across microservices?',
                ideal: 'Distributed transactions are typically handled using the Saga Pattern (orchestrated or choreographed) with compensating transactions to roll back state, or 2-Phase Commit (2PC) for strict but blocking consistency.',
                concepts: ['Saga Pattern', '2-Phase Commit', 'compensating transaction', 'eventual consistency']
            },
            {
                text: 'Explain your approach to state management in a large React application.',
                ideal: 'Approach involves separating state by scope: local (useState), shared context (useContext), global store (Redux Toolkit, Zustand) for complex actions, and server-cache stores (React Query/RTK Query) for query synchronization.',
                concepts: ['Zustand/Redux', 'context api', 'React Query', 'server state', 'local state']
            }
        ]
    },
    'Java Developer': {
        easy: [
            {
                text: 'What is the difference between == and equals() in Java?',
                ideal: 'The == operator compares memory references (addresses) to check if two objects are the same instance. The equals() method is overridden to compare the actual values or content of the objects.',
                concepts: ['memory reference', 'object content', 'overriding', 'string pool']
            },
            {
                text: 'Explain the concept of garbage collection in Java.',
                ideal: 'Garbage Collection is automatic memory management in the JVM that identifies and deletes unreferenced objects from the heap to free up memory, using algorithms like Mark-and-Sweep, G1, or ZGC.',
                concepts: ['JVM', 'heap memory', 'Mark-and-Sweep', 'unreferenced objects']
            },
            {
                text: 'What is the difference between ArrayList and LinkedList?',
                ideal: 'ArrayList uses a dynamic resizing array, offering O(1) random access but O(N) shifts for insertions/deletions. LinkedList is a doubly-linked list, providing O(1) insertions/deletions but O(N) traversal search.',
                concepts: ['array', 'doubly-linked list', 'random access', 'time complexity', 'resizing']
            }
        ],
        medium: [
            {
                text: 'How does HashMap work internally in Java?',
                ideal: 'HashMap uses hashing, storing Key-Value pairs in Node arrays. It calls hashCode() to find bucket indexes. On collision, it uses equals() in linked lists, which convert to balanced Red-Black trees if the bucket size exceeds 8.',
                concepts: ['hashing', 'hashCode', 'collision', 'linked list', 'Red-Black tree', 'buckets']
            },
            {
                text: 'Explain the Java Memory Model.',
                ideal: 'The Java Memory Model (JMM) defines how threads interact through memory. It divides JVM memory into Stack (local variables, thread-safe) and Heap (shared objects). It uses keywords like volatile and synchronized to guarantee visibility.',
                concepts: ['Stack', 'Heap', 'thread safety', 'volatile', 'synchronized', 'JMM']
            },
            {
                text: 'What are the design patterns you have used in Java?',
                ideal: 'Common design patterns include Creational (Singleton, Builder, Factory), Structural (Adapter, Decorator), and Behavioral (Observer, Strategy). Spring Framework uses patterns like Dependency Injection and Proxy.',
                concepts: ['Singleton', 'Builder', 'Factory', 'Observer', 'Dependency Injection']
            }
        ],
        hard: [
            {
                text: 'How would you troubleshoot a memory leak in a Java application?',
                ideal: 'Troubleshooting involves capturing heap dumps using jmap, analyzing them with tools like Eclipse Memory Analyzer (MAT) or JProfiler, checking for unclosed resources, static collections holding references, and profiling GC activity.',
                concepts: ['heap dump', 'MAT/JProfiler', 'GC activity', 'static references', 'memory leaks']
            },
            {
                text: 'Explain how you would implement a thread-safe cache in Java.',
                ideal: 'Can be implemented using ConcurrentHashMap for lock-striping, or using a combination of ReentrantReadWriteLock for read concurrency and write locking, or leveraging Third-party libraries like Caffeine or Guava.',
                concepts: ['ConcurrentHashMap', 'lock-striping', 'ReadWriteLock', 'Caffeine/Guava']
            },
            {
                text: 'Design a concurrent system using Java concurrency utilities.',
                ideal: 'Requires using ThreadPoolExecutor via Executors, coordinating tasks using CountDownLatch or CyclicBarrier, utilizing BlockingQueue for producer-consumer patterns, and using Atomic variables to avoid locks.',
                concepts: ['ExecutorService', 'CountDownLatch', 'BlockingQueue', 'AtomicInteger', 'CyclicBarrier']
            }
        ]
    },
    // Fallbacks to generic questions for the other roles to ensure same schema robustness
    'ML Engineer': {
        easy: [
            {
                text: 'What is the difference between precision and recall?',
                ideal: 'Precision measures correct positive predictions divided by all positive predictions (avoids false positives). Recall measures correct positive predictions divided by all actual positives (avoids false negatives).',
                concepts: ['precision', 'recall', 'false positive', 'false negative', 'F1-score']
            },
            {
                text: 'Explain what a confusion matrix is.',
                ideal: 'A confusion matrix is a table summarizing classification model performance. It displays True Positives, True Negatives, False Positives, and False Negatives, enabling calculation of precision, recall, and accuracy.',
                concepts: ['True Positive', 'True Negative', 'False Positive', 'False Negative', 'accuracy']
            },
            {
                text: 'What is feature engineering?',
                ideal: 'Feature engineering is the process of using domain knowledge of the data to create, modify, or select features (input variables) that help machine learning algorithms learn more effectively.',
                concepts: ['imputation', 'scaling', 'one-hot encoding', 'dimensionality reduction']
            }
        ],
        medium: [
            {
                text: 'How do you choose between different ML algorithms for a problem?',
                ideal: 'Choice depends on dataset size, training time constraints, model interpretability requirements, performance targets, and data types. Linear models for simplicity, Tree models for tabulate, DL for unstructured media.',
                concepts: ['interpretability', 'training speed', 'linear models', 'tree models', 'neural nets']
            },
            {
                text: 'Explain gradient descent and its variants.',
                ideal: 'Gradient descent minimizes loss functions. Batch uses entire dataset. Stochastic (SGD) uses one sample per step, adding noise. Mini-batch strikes a balance. Optimizers like Adam adjust learning rates dynamically.',
                concepts: ['SGD', 'mini-batch', 'learning rate', 'Adam optimizer', 'loss function']
            },
            {
                text: 'How would you handle missing data in a dataset?',
                ideal: 'Missing data can be dropped if minimal, imputed using mean/median/mode, filled using algorithms like KNN Imputer, or flagged with boolean indicator columns so the model learns the absence.',
                concepts: ['imputation', 'KNN Imputer', 'dropping', 'missing indicators']
            }
        ],
        hard: [
            {
                text: 'Design an ML pipeline that handles data drift in production.',
                ideal: 'The pipeline must capture inference logs, calculate drift metrics (PSI, KS-Test) against baseline distributions, alert engineers on drift threshold, and trigger automated retraining pipelines using orchestrators like Airflow.',
                concepts: ['data drift', 'PSI', 'Airflow', 'retraining', 'inference logging']
            },
            {
                text: 'How would you optimize a model for inference latency?',
                ideal: 'Optimize using model quantization (FP32 to FP16/INT8), structural pruning to remove unnecessary weights, model distillation, compile using ONNX/TensorRT, and batching requests using server engines like Triton.',
                concepts: ['quantization', 'pruning', 'distillation', 'ONNX', 'Triton']
            },
            {
                text: 'Explain how you would implement continuous training for an ML system.',
                ideal: 'Continuous training (CT) involves scheduling automated runs, monitoring performance drops, querying newly annotated data, running automated tests on newly trained models, and doing canary deployments.',
                concepts: ['continuous training', 'Airflow', 'canary deployment', 'evaluations', 'CI/CD']
            }
        ]
    },
    'Backend Developer': {
        easy: [
            {
                text: 'What is the difference between SQL and NoSQL databases?',
                ideal: 'SQL databases are relational, schema-based, support ACID transactions, and scale vertically. NoSQL databases are non-relational, flexible schema, partition-tolerant (BASE), and scale horizontally.',
                concepts: ['relational', 'schema', 'ACID', 'NoSQL', 'horizontal scaling', 'vertical scaling']
            },
            {
                text: 'Explain what an API endpoint is.',
                ideal: 'An API endpoint is a specific URL path representing a resource that allows clients to access or modify data using HTTP methods (GET, POST, PUT, DELETE) on a server.',
                concepts: ['URL', 'HTTP methods', 'resource', 'server']
            },
            {
                text: 'What is the purpose of indexing in databases?',
                ideal: 'Indexing creates helper structures (typically B-Trees) that allow databases to find rows quickly, transforming slow O(N) table scans into fast O(log N) searches at the cost of disk space and write speed.',
                concepts: ['indexing', 'B-Tree', 'query speed', 'disk space', 'write overhead']
            }
        ],
        medium: [
            {
                text: 'How do you design a database schema for a multi-tenant application?',
                ideal: 'Designed via three models: Database-per-tenant (strict isolation, costly), Schema-per-tenant (shared database, logically isolated), or Shared-database-shared-schema (using tenant_id columns, easy to scale but complex security).',
                concepts: ['multi-tenant', 'isolation', 'tenant_id', 'shared schema', 'schema-per-tenant']
            },
            {
                text: 'Explain caching strategies and when to use them.',
                ideal: 'Strategies include Cache-Aside (application checks cache first, then DB), Read-Through (cache loads from DB), Write-Through (cache written first, then DB), and Write-Behind (DB updated asynchronously).',
                concepts: ['Cache-Aside', 'Write-Through', 'Redis', 'cache eviction', 'TTL']
            },
            {
                text: 'How would you implement pagination for a large dataset?',
                ideal: 'Using either Offset pagination (LIMIT X OFFSET Y - slow for large tables since it reads discarded rows) or Keyset pagination (Cursor-based: WHERE id > last_seen LIMIT X - scales O(1) with indexing).',
                concepts: ['Offset pagination', 'Keyset pagination', 'cursor', 'LIMIT OFFSET', 'indexing']
            }
        ],
        hard: [
            {
                text: 'Design a rate limiting system for an API.',
                ideal: 'Design using algorithms like Token Bucket or Leaky Bucket, storing counters in Redis with atomic operations (INCR) and TTLs, and returning HTTP 429 Too Many Requests response headers.',
                concepts: ['Token Bucket', 'Redis', 'HTTP 429', 'INCR', 'TTL', 'rate limiter']
            },
            {
                text: 'How do you ensure data consistency in distributed systems?',
                ideal: 'In distributed databases, consistency is managed based on the CAP theorem, selecting consistency or availability. Implementations include 2-Phase Commit, Saga Orchestration, or Eventual Consistency using Kafka.',
                concepts: ['CAP theorem', '2-Phase Commit', 'Saga Pattern', 'eventual consistency', 'vector clocks']
            },
            {
                text: 'Explain how you would implement zero-downtime deployments.',
                ideal: 'Zero-downtime is done using Blue-Green deployments (switching load balancer traffic between duplicate environments) or Rolling deployments (updating instances in steps) paired with database migrations that preserve backward compatibility.',
                concepts: ['Blue-Green', 'Rolling update', 'load balancer', 'database migrations', 'rollback']
            }
        ]
    },
    'DevOps Engineer': {
        easy: [
            {
                text: 'What is CI/CD and why is it important?',
                ideal: 'CI/CD stands for Continuous Integration (merging and building code frequently with automated tests) and Continuous Delivery/Deployment (automating the release of validated code to production).',
                concepts: ['integration', 'deployment', 'automated testing', 'release pipeline']
            },
            {
                text: 'Explain the difference between containers and virtual machines.',
                ideal: 'Containers share the host operating system kernel, making them lightweight and fast to boot. Virtual Machines include a full guest OS, running on a hypervisor, providing stronger isolation but consuming more resources.',
                concepts: ['kernel sharing', 'guest OS', 'hypervisor', 'Docker', 'virtualization']
            },
            {
                text: 'What is Infrastructure as Code (IaC)?',
                ideal: 'IaC is the practice of managing and provisioning IT infrastructure using configuration files (like Terraform, CloudFormation) instead of manual dashboard clicks, enabling version control and reproducibility.',
                concepts: ['Terraform', 'version control', 'declarative', 'provisioning']
            }
        ],
        medium: [
            {
                text: 'How do you set up a Kubernetes cluster for production?',
                ideal: 'Requires multiple master/control plane nodes for high availability, worker nodes across availability zones, secure etcd configurations, network policies, ingress controllers, resource limits, and monitoring.',
                concepts: ['high availability', 'control plane', 'etcd', 'ingress', 'resource limits', 'network policy']
            },
            {
                text: 'Explain your monitoring and alerting strategy.',
                ideal: 'Strategy includes collecting metrics (Prometheus) and logs (ELK/Grafana Loki), setting up SLIs/SLOs, configuring alerts using Alertmanager (sending to PagerDuty/Slack), and monitoring the four golden signals (Latency, Traffic, Errors, Saturation).',
                concepts: ['Prometheus/Grafana', 'ELK', 'Alertmanager', 'SLO', 'four golden signals']
            },
            {
                text: 'How do you manage secrets in a CI/CD pipeline?',
                ideal: 'Secrets should never be hardcoded. They are managed using dedicated stores like HashiCorp Vault, AWS Secrets Manager, or GitHub Actions Encrypted Secrets, injected dynamically into container runtime environment variables.',
                concepts: ['HashiCorp Vault', 'Secrets Manager', 'environment variables', 'GitHub secrets']
            }
        ],
        hard: [
            {
                text: 'Design a disaster recovery plan for a cloud-native application.',
                ideal: 'The plan defines RTO (Recovery Time Objective) and RPO (Recovery Point Objective), utilizing strategies like Active-Active multi-region replication, Pilot Light backups, automated DNS failovers (Route53), and scheduled game-day drills.',
                concepts: ['RTO', 'RPO', 'Active-Active', 'Pilot Light', 'Route53 failover', 'backups']
            },
            {
                text: 'How would you implement GitOps for a microservices architecture?',
                ideal: 'Implement using tools like ArgoCD or FluxCD, treating a git repository as the single source of truth for desired cluster state. Changes are committed to Git, and agents pull and reconcile the cluster state automatically.',
                concepts: ['ArgoCD/FluxCD', 'git source of truth', 'reconciliation loop', 'pull model']
            },
            {
                text: 'Explain how you would optimize cloud infrastructure costs at scale.',
                ideal: 'Optimize by setting up auto-scaling rules, using spot/preemptible instances for non-prod, rightsizing oversized containers, implementing cost tracking tags, cleaning up unused storage volumes, and purchasing saving plans.',
                concepts: ['auto-scaling', 'Spot instances', 'rightsizing', 'saving plans', 'cost allocation tags']
            }
        ]
    },
    'Cybersecurity Analyst': {
        easy: [
            {
                text: 'What is the difference between symmetric and asymmetric encryption?',
                ideal: 'Symmetric encryption uses a single shared key for both encryption and decryption (fast, e.g. AES). Asymmetric encryption uses a public key for encryption and a private key for decryption (slower but solves key distribution, e.g. RSA).',
                concepts: ['shared key', 'public key', 'private key', 'AES', 'RSA']
            },
            {
                text: 'Explain what a firewall does.',
                ideal: 'A firewall is a network security device that monitors and filters incoming and outgoing network traffic based on an organization’s previously established security rules, acting as a barrier between secure and insecure networks.',
                concepts: ['traffic filtering', 'port rules', 'packet inspection', 'security barrier']
            },
            {
                text: 'What is the CIA triad in security?',
                ideal: 'The CIA triad stands for Confidentiality (preventing unauthorized access), Integrity (preventing unauthorized modification), and Availability (ensuring authorized access when needed).',
                concepts: ['Confidentiality', 'Integrity', 'Availability', 'information security']
            }
        ],
        medium: [
            {
                text: 'How would you conduct a vulnerability assessment?',
                ideal: 'Assessment is done by scanning systems using automated tools (Nessus), cataloging vulnerabilities, rating their severity using CVSS scores, cross-referencing with threat intelligence, and recommending patch remediations.',
                concepts: ['Nessus', 'CVSS score', 'scanning', 'remediation', 'CVE']
            },
            {
                text: 'Explain the different types of phishing attacks.',
                ideal: 'Phishing includes general spam, Spear Phishing (targeting specific individuals), Whaling (targeting C-level executives), Smishing (SMS-based), and Vishing (voice-based scams).',
                concepts: ['Spear Phishing', 'Whaling', 'social engineering', 'Smishing', 'credential harvesting']
            },
            {
                text: 'What is the OWASP Top 10?',
                ideal: 'OWASP Top 10 is a standard awareness document representing the most critical security risks to web applications, including SQL Injection, Broken Authentication, Cross-Site Scripting (XSS), and XML External Entities (XXE).',
                concepts: ['Injection', 'XSS', 'Broken Authentication', 'Broken Access Control', 'OWASP']
            }
        ],
        hard: [
            {
                text: 'Design a security architecture for a cloud-based application.',
                ideal: 'Requires applying defense-in-depth, enforcing IAM with least privilege, enabling VPC segmentations, using Web Application Firewalls (WAF), encrypting data at rest and in transit, and enabling continuous SIEM monitoring.',
                concepts: ['defense-in-depth', 'least privilege IAM', 'WAF', 'SIEM', 'encryption', 'VPC flow logs']
            },
            {
                text: 'How would you respond to a ransomware incident?',
                ideal: 'Response follows the SANS/NIST IR framework: Isolate infected machines (containment), verify backups are unaffected, identify entry vectors, wipe systems, restore from backups, and patch vulnerabilities.',
                concepts: ['Incident Response', 'containment', 'backups restoration', 'root cause analysis']
            },
            {
                text: 'Explain how you would implement zero-trust architecture in an enterprise.',
                ideal: 'Zero Trust eliminates implicit trust. Implementation requires verifying explicitly (identity, location, device health), enforcing least privilege access, micro-segmenting networks, and continuously monitoring actions.',
                concepts: ['micro-segmentation', 'continuous verification', 'least privilege', 'implicit trust elimination', 'identity provider']
            }
        ]
    }
};

const FILLER_WORDS = [
    'um', 'ah', 'like', 'actually', 'basically',
    'you know', 'sort of', 'kind of', 'i mean'
];

/**
 * Keyword-to-Followup question mapping.
 * Matches keywords (case-insensitive) in the candidate's response to ask a dynamic follow-up.
 */
const FOLLOWUP_BANK = {
    'smote': [
        'Why choose SMOTE over simple random oversampling? Are there risks of overfitting with SMOTE?',
        'How does SMOTE generate synthetic samples mathematically? Can it exacerbate noise?'
    ],
    'regularization': [
        'Can you explain why L1 regularization leads to sparsity whereas L2 doesn\'t?',
        'How do you choose the regularization strength parameter (lambda or alpha)?'
    ],
    'cnn': [
        'Why are CNNs translation invariant? What role does pooling play in this?',
        'What activation functions are typically used in CNN architectures, and why not Vision Transformers (ViT)?'
    ],
    'transformer': [
        'What is the computational complexity of the self-attention mechanism with respect to sequence length, and how does it scale?',
        'Explain query, key, and value vectors in the self-attention mechanism.'
    ],
    'overfitting': [
        'How does dropout behave differently during training versus during model evaluation or inference?',
        'How would you use early stopping to prevent overfitting, and how do you define the patience parameter?'
    ],
    'fastapi': [
        'How would you handle rate limiting and API security in a production-ready FastAPI deployment?',
        'What are the advantages of asynchronous endpoints (async/await) in FastAPI?'
    ],
    'index': [
        'What are the tradeoffs of adding too many indexes to a database table? How does it affect write performance?',
        'What is the difference between a clustered and non-clustered index?'
    ],
    'microservice': [
        'How do you manage database schema migrations across microservices without causing service outages?',
        'How does service discovery and API gateways resolve routing in a Kubernetes-orchestrated microservices stack?'
    ],
    'saga': [
        'What is the difference between orchestrator-based and choreography-based Saga patterns?',
        'How do you handle failures in a Saga when a compensating transaction also fails?'
    ],
    'redux': [
        'What is the difference between Redux state and React Context API? When would you use one over the other?',
        'Explain the concept of pure reducers and immutability in Redux.'
    ],
    'garbage': [
        'How does the G1 garbage collector differ from the traditional CMS (Concurrent Mark Sweep) collector?',
        'What is the difference between minor GC and major GC (Full GC) in Java?'
    ],
    'hashmap': [
        'What happens in a Java HashMap when two different keys return the same hash code? How is it resolved?',
        'Why does Java 8 convert linked lists in buckets to balanced trees? What is the performance impact?'
    ],
    'thread': [
        'How does a ReentrantLock differ from a synchronized block in Java concurrency?',
        'What is a thread pool executor leak, and how do you prevent thread starvation in Java?'
    ],
    'sql': [
        'What are the differences between the four isolation levels in SQL databases, and what anomalies do they prevent?',
        'Explain the CAP theorem. In a network partition, would you prefer Consistency or Availability?'
    ],
    'encryption': [
        'How does a Diffie-Hellman key exchange establish a shared secret over an insecure channel without transmitting the key?',
        'What is the difference between symmetric AES and asymmetric RSA regarding security and performance?'
    ]
};

/**
 * Build the question list for the current state.jobRole and state.difficulty.
 * Writes directly into state.questions.
 */
function generateQuestions() {
    const bank = QUESTION_BANK[state.jobRole] || QUESTION_BANK['Full Stack Developer'];
    
    // Choose questions based on difficulty level
    const diff = state.difficulty || 'medium';
    let selectedQuestions = [];
    
    // Attempt to take 2 easy, 2 medium, 2 hard from selected role, fallback to whatever is available
    if (diff === 'easy') {
        selectedQuestions = [
            ...bank.easy.slice(0, 2),
            ...bank.medium.slice(0, 1),
            ...bank.hard.slice(0, 1)
        ];
    } else if (diff === 'hard') {
        selectedQuestions = [
            ...bank.easy.slice(0, 1),
            ...bank.medium.slice(0, 1),
            ...bank.hard.slice(0, 2)
        ];
    } else { // medium
        selectedQuestions = [
            ...bank.easy.slice(0, 1),
            ...bank.medium.slice(0, 2),
            ...bank.hard.slice(0, 1)
        ];
    }
    
    // Format them correctly as objects in state.questions
    state.questions = selectedQuestions.map(q => ({
        text: q.text,
        ideal: q.ideal,
        concepts: q.concepts
    }));
    
    // Append resume-based project and skill questions
    const primaryProject = state.projects[0] || 'Crop Disease Detection';
    const primarySkill = state.skills[0] || 'Python';
    
    state.questions.push({
        text: `Tell me about your project: ${primaryProject}. What was your architecture and what challenges did you face?`,
        ideal: `The candidate should explain the project's architecture, technologies used like ${primarySkill}, their role, and key challenges solved.`,
        concepts: ['architecture', 'challenges', 'implementation', primaryProject.toLowerCase(), 'technologies']
    });
    
    state.questions.push({
        text: `How would you apply ${primarySkill} in a real-world scenario to optimize performance and solve scaling issues?`,
        ideal: `The candidate should discuss how to use ${primarySkill} best practices, library optimizations, multi-threading/concurrency, and memory management in production.`,
        concepts: ['performance', 'optimization', 'scaling', primarySkill.toLowerCase(), 'production', 'memory']
    });
}
