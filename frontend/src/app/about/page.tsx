"use client";

import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Card } from '@/components/ui/card';
import { Users, Target, Award, Zap } from 'lucide-react';
import { useSettings } from '@/components/public/SettingsContext';

export default function AboutPage() {
  const { settings } = useSettings();
  const siteName = settings.site_name || 'BlogCMS';
  const aboutTitle = settings.about_title || `About ${siteName}`;
  const aboutSubtitle = settings.about_subtitle || settings.site_description || "We're passionate about creating a platform where ideas flourish and stories come to life. Our mission is to empower writers and connect readers with amazing content.";
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4">{aboutTitle}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">{aboutSubtitle}</p>
          </section>

          {/* Mission Section */}
          <section className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground mb-4">
                  {siteName} was founded with a simple yet powerful vision: to democratize content creation 
                  and distribution. We believe everyone has a story to tell, and we're here to provide 
                  the tools and platform to share those stories with the world.
                </p>
                <p className="text-muted-foreground">
                  Our platform combines cutting-edge technology with user-friendly design, making it easy 
                  for writers to focus on what they do best - creating compelling content.
                </p>
              </div>
              <div className="bg-muted rounded-lg h-96 flex items-center justify-center">
                <span className="text-muted-foreground">Mission Image</span>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose {siteName}?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Community First</h3>
                <p className="text-sm text-muted-foreground">
                  Join a vibrant community of writers and readers
                </p>
              </Card>
              <Card className="p-6 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Focused Writing</h3>
                <p className="text-sm text-muted-foreground">
                  Distraction-free environment for your creativity
                </p>
              </Card>
              <Card className="p-6 text-center">
                <Award className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Quality Content</h3>
                <p className="text-sm text-muted-foreground">
                  Curated and featured posts from top writers
                </p>
              </Card>
              <Card className="p-6 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Optimized performance for the best experience
                </p>
              </Card>
            </div>
          </section>

          {/* Team Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: 'John Doe', role: 'Founder & CEO', bio: 'Passionate about storytelling and technology' },
                { name: 'Jane Smith', role: 'Head of Content', bio: 'Curating amazing stories for our readers' },
                { name: 'Mike Johnson', role: 'Lead Developer', bio: 'Building the future of content platforms' }
              ].map((member) => (
                <Card key={member.name} className="p-6 text-center">
                  <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4" />
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-primary text-primary-foreground rounded-lg p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Writing?</h2>
            <p className="mb-8 max-w-2xl mx-auto">
              Join thousands of writers who are already sharing their stories on {siteName}.
            </p>
            <a href="/login" className="inline-block bg-background text-foreground px-6 py-3 rounded-md hover:opacity-90 transition-opacity">
              Get Started Today
            </a>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
