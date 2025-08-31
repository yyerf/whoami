import React from 'react';
import { Card } from '@/components/ui/card';
import profilePhoto from '@/assets/profile-photo.jpg';

const ProfileCard = () => {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="text-center space-y-4">
        {/* Profile Photo */}
        <div className="relative mx-auto w-32 h-32 rounded-lg overflow-hidden border-2 border-primary/20">
          <img 
            src={profilePhoto} 
            alt="Profile photo" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Name and Title */}
        <div>
          <h2 className="text-xl font-bold text-primary">Your Name</h2>
          <p className="text-muted-foreground text-sm">Software Engineer</p>
        </div>
        
        {/* Terminal Info */}
        <div className="bg-muted/30 rounded p-3 text-left">
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">OS:</span>
              <span className="text-card-foreground">Ubuntu 22.04</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shell:</span>
              <span className="text-card-foreground">bash</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session:</span>
              <span className="text-accent">Active</span>
            </div>
          </div>
        </div>
        
        {/* Quick Commands */}
        <div className="text-left">
          <h3 className="text-sm font-semibold text-primary mb-2">Quick Commands:</h3>
          <div className="space-y-1 text-xs font-mono">
            <div className="text-muted-foreground">• <span className="text-accent">about</span> - Learn about me</div>
            <div className="text-muted-foreground">• <span className="text-accent">projects</span> - View projects</div>
            <div className="text-muted-foreground">• <span className="text-accent">contact</span> - Get in touch</div>
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="text-primary">Online</span>
        </div>
      </div>
    </Card>
  );
};

export default ProfileCard;