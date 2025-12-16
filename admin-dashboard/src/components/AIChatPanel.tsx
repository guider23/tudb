import { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, TrendingUp, AlertCircle, Lightbulb, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agents_used?: string[];
}

interface Suggestion {
  type: 'query' | 'insight' | 'alert';
  title: string;
  description: string;
}

interface AIResponse {
  message?: string;
  response?: string;
  agents_used?: string[];
}

export default function AIChatPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [useMultiAgent, setUseMultiAgent] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! 👋 I'm your TUDB Multi-Agent AI System.

I coordinate a team of 5 specialized agents:

• Query Agent - Translates natural language to SQL
• Security Agent - Validates query safety
• Optimization Agent - Improves performance
• Analytics Agent - Generates insights
• Coordinator - Orchestrates everything

Try asking me to analyze your data or generate queries!`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get agent status
  const { data: agentStatus } = useQuery({
    queryKey: ['agent-status'],
    queryFn: () => api.getAgentStatus(),
    refetchInterval: 30000,
    enabled: isOpen,
  });

  const suggestions: Suggestion[] = [
    {
      type: 'query',
      title: 'Top Customers',
      description: 'Show me the top 10 customers by total revenue',
    },
    {
      type: 'query',
      title: 'Sales Analysis',
      description: 'Analyze monthly sales trends for the past year',
    },
    {
      type: 'query',
      title: 'Recent Activity',
      description: 'Show all orders placed in the last 30 days',
    },
  ];

  // Multi-Agent mutation
  const multiAgentMutation = useMutation<AIResponse, Error, string>({
    mutationFn: async (message: string) => {
      // Get first active connection
      const connectionsData: any = await queryClient.getQueryData(['connections']);
      const connections = Array.isArray(connectionsData) 
        ? connectionsData 
        : connectionsData?.connections || [];
      
      const activeConnection = connections.find((c: any) => c.is_active);
      const connectionId = activeConnection?.id || connections[0]?.id;

      if (!connectionId) {
        throw new Error('No database connection available. Please add a connection first.');
      }

      return api.processAgentRequest(message, connectionId);
    },
    onSuccess: (response) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.response || response.message || 'Response received',
        timestamp: new Date(),
        agents_used: response.agents_used,
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error) => {
      console.error('Multi-agent error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: error.message || "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  // Simple AI Chat mutation (fallback)
  const chatMutation = useMutation<AIResponse, Error, string>({
    mutationFn: (message: string) =>
      api.sendAIMessage({ message, context: messages.slice(-5) }),
    onSuccess: (response) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message || 'Response received',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error) => {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Use multi-agent or simple chat based on toggle
    if (useMultiAgent) {
      multiAgentMutation.mutate(inputMessage);
    } else {
      chatMutation.mutate(inputMessage);
    }
    
    setInputMessage('');
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === 'query') {
      // Navigate to query page with pre-filled question
      navigate(`/query?q=${encodeURIComponent(suggestion.description)}`);
      setIsOpen(false);
    } else {
      const message = `Tell me more about: ${suggestion.title}`;
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      
      // Use multi-agent or simple chat based on toggle
      if (useMultiAgent) {
        multiAgentMutation.mutate(message);
      } else {
        chatMutation.mutate(message);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'query':
        return <Lightbulb className="w-4 h-4" />;
      case 'insight':
        return <TrendingUp className="w-4 h-4" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'query':
        return 'text-[#007AFF] bg-[#007AFF]/10';
      case 'insight':
        return 'text-[#34C759] bg-[#34C759]/10';
      case 'alert':
        return 'text-[#FF3B30] bg-[#FF3B30]/10';
      default:
        return 'text-[#5856D6] bg-[#5856D6]/10';
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <div className="fixed bottom-8 right-8 z-50 group">
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white rounded-full shadow-2xl hover:shadow-[0_12px_40px_rgba(0,122,255,0.4)] active:scale-95 transition-all flex items-center justify-center relative"
            aria-label="Open AI Assistant"
          >
            <Sparkles className="w-6 h-6 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#34C759] rounded-full animate-pulse border-2 border-white"></div>
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-[#1D1D1F] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ask AI Assistant
            <div className="absolute top-full right-4 w-2 h-2 bg-[#1D1D1F] transform rotate-45 -mt-1"></div>
          </div>
        </div>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-8 right-8 w-96 h-[600px] rounded-[22px] border border-black/[0.06] flex flex-col z-50 shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-black/[0.06]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#111111]">
                  {useMultiAgent ? 'Multi-Agent AI' : 'AI Assistant'}
                </h3>
                <p className="text-xs text-[#86868B]">
                  {useMultiAgent ? '5 specialized agents' : 'Always here to help'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Multi-agent toggle */}
              <button
                onClick={() => setUseMultiAgent(!useMultiAgent)}
                className={`p-2 rounded-full transition-all ${
                  useMultiAgent ? 'bg-[#007AFF] text-white' : 'bg-black/5 text-[#86868B]'
                }`}
                title={useMultiAgent ? 'Disable Multi-Agent' : 'Enable Multi-Agent'}
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#86868B]" />
              </button>
            </div>
          </div>

          {/* Agent Status - Only show when multi-agent is enabled */}
          {useMultiAgent && agentStatus && agentStatus.agents && (
            <div className="p-3 border-b border-black/[0.06] bg-gradient-to-r from-blue-50/50 to-purple-50/50">
              <p className="text-xs font-medium text-[#86868B] mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                Active Agents
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {agentStatus.agents.map((agent: any, idx: number) => (
                  <div
                    key={idx}
                    className="group relative flex items-center justify-center"
                    title={`${agent.name}: ${agent.description}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-all ${
                        agent.status === 'active'
                          ? 'bg-[#34C759] animate-pulse'
                          : 'bg-[#86868B]/30'
                      }`}
                    ></div>
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                      <div className="px-2 py-1 bg-[#1D1D1F] text-white text-[9px] rounded whitespace-nowrap">
                        {agent.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="p-4 border-b border-black/[0.06] space-y-2">
            <p className="text-xs font-medium text-[#86868B] mb-2">Quick Actions</p>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl bg-white/50 hover:bg-white/80 border border-black/[0.06] transition-all group"
                >
                  <div className={`w-8 h-8 rounded-full ${getColor(suggestion.type)} flex items-center justify-center flex-shrink-0`}>
                    {getIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-[#111111] mb-0.5">{suggestion.title}</div>
                    <div className="text-xs text-[#86868B]">{suggestion.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-[18px] px-4 py-2.5 ${
                    message.role === 'user'
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-white/50 text-[#111111] border border-black/[0.06]'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.agents_used && message.agents_used.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-black/[0.06]">
                      <p className="text-[10px] text-[#86868B] mb-1">Agents used:</p>
                      <div className="flex flex-wrap gap-1">
                        {message.agents_used.map((agent, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 bg-[#007AFF]/10 text-[#007AFF] rounded"
                          >
                            {agent}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-white/60' : 'text-[#86868B]'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {(chatMutation.isPending || multiAgentMutation.isPending) && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-[18px] px-4 py-2.5 bg-white/50 border border-black/[0.06]">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[#86868B] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#86868B] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-[#86868B] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  {multiAgentMutation.isPending && (
                    <p className="text-xs text-[#86868B] mt-1">Multi-agent processing...</p>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-black/[0.06]">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={useMultiAgent ? "Ask the multi-agent system..." : "Ask me anything..."}
                className="flex-1 px-4 py-2.5 bg-white/50 border border-black/[0.06] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all placeholder:text-[#86868B]"
              />
              <button
                onClick={handleSend}
                disabled={!inputMessage.trim() || chatMutation.isPending || multiAgentMutation.isPending}
                className="w-10 h-10 bg-[#007AFF] text-white rounded-full flex items-center justify-center hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
