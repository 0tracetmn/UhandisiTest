import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Video, MessageCircle, Calendar, FileText, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Expert Tutors',
      description: 'Learn from qualified tutors specializing in GET/FET Physics & Mathematics',
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: 'Flexible Booking',
      description: 'Book face-to-face or online sessions at times that work for you',
    },
    {
      icon: <Video className="w-8 h-8" />,
      title: 'Learning Materials',
      description: 'Access notes, diagrams, and video lessons anytime',
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'Direct Communication',
      description: 'Chat with your tutors and get help when you need it',
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: 'Progress Tracking',
      description: 'Monitor your learning journey with detailed reports',
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: 'Easy Payments',
      description: 'Secure online payment and invoicing system',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/63c6bf0a-3055-4ef7-9344-7ee7e8b608c7.jpg"
                alt="Uhandisi Tutors"
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Uhandisi Tutors</h1>
                <p className="text-xs text-slate-600">GET/FET Physics & Mathematics</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/register')}>Get Started</Button>
            </div>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-6">
            Master Physics & Mathematics
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Expert tutoring for GET/FET students. Book online or face-to-face sessions with
            qualified educators who care about your success.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/register')}>
              Book a Session
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/register')}>
              Become a Tutor
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-blue-100 rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="text-blue-600 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center text-white shadow-xl">
          <h3 className="text-3xl font-bold mb-4">Ready to Excel in Your Studies?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of students who have improved their grades with Uhandisi Tutors
          </p>
          <Button
            size="lg"
            className="bg-slate-900 text-white hover:bg-slate-800 font-bold text-lg shadow-lg"
            onClick={() => navigate('/register')}
          >
            Start Learning Today
          </Button>
        </div>
      </section>

      <footer className="bg-slate-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">
            © 2024 Uhandisi Tutors. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
