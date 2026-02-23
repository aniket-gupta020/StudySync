import React from 'react';
import GlassCard from '../components/layout/GlassCard';
import { useToast, ToastContainer } from '../components/layout/Toast';
import { BookOpen, Users, Calendar, TrendingUp, Award, Target } from 'lucide-react';

/**
 * DesignSystemDemo - Showcase page for all design system components
 * Demonstrates glassmorphism effects, responsive layouts, and orange fusion theme
 */
const DesignSystemDemo = () => {
    const { toasts, addToast, removeToast } = useToast();

    const stats = [
        { icon: BookOpen, label: 'Courses', value: '12', color: 'text-primary-500' },
        { icon: Users, label: 'Study Groups', value: '8', color: 'text-primary-600' },
        { icon: Calendar, label: 'Sessions', value: '24', color: 'text-accent-500' },
        { icon: TrendingUp, label: 'Progress', value: '87%', color: 'text-primary-700' },
    ];

    const features = [
        {
            icon: Award,
            title: 'Achievement Tracking',
            description: 'Monitor your learning progress with detailed analytics and milestone tracking.',
        },
        {
            icon: Target,
            title: 'Goal Setting',
            description: 'Set personalized study goals and track your progress towards completion.',
        },
        {
            icon: Users,
            title: 'Collaborative Learning',
            description: 'Join study groups and collaborate with peers on challenging topics.',
        },
    ];

    return (
        <div className="min-h-screen p-4 md:p-8 md:ml-64 mb-20 md:mb-0">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                    StudySync Design System
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Glassmorphism & Orange Fusion Theme Demo
                </p>
            </div>

            {/* Toast Demo Buttons */}
            <div className="mb-8">
                <GlassCard>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">
                        Toast Notifications
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => addToast('Success! Your changes have been saved.', 'success')}
                            className="glass-button"
                        >
                            Show Success Toast
                        </button>
                        <button
                            onClick={() => addToast('Error! Something went wrong.', 'error')}
                            className="glass-button-secondary"
                        >
                            Show Error Toast
                        </button>
                        <button
                            onClick={() => addToast('Info: This is an informational message.', 'info')}
                            className="glass-button-secondary"
                        >
                            Show Info Toast
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* Stats Grid - Responsive Layout Demo */}
            <div className="grid grid-mobile grid-tablet grid-desktop mb-8">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <GlassCard key={index} withGlow className="text-center">
                            <Icon className={`${stat.color} mx-auto mb-3`} size={32} />
                            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                                {stat.value}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                {stat.label}
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {/* Features Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
                    Key Features
                </h2>
                <div className="grid grid-mobile grid-tablet gap-6">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <GlassCard key={index}>
                                <div className="flex items-start gap-4">
                                    <div className="glass-button-icon">
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            </div>

            {/* Glass Effect Variations */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
                    Glass Effect Variations
                </h2>
                <div className="grid grid-mobile grid-tablet grid-desktop gap-6">
                    <GlassCard>
                        <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">
                            Standard Glass Card
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Default glass effect with backdrop blur and semi-transparent background.
                        </p>
                    </GlassCard>

                    <GlassCard withGlow>
                        <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">
                            Glass Card with Glow
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Enhanced with orange glow effect for emphasis.
                        </p>
                    </GlassCard>

                    <GlassCard withGlow glowColor="#10b981">
                        <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">
                            Custom Glow Color
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Glass card with custom green glow color.
                        </p>
                    </GlassCard>
                </div>
            </div>

            {/* Button Styles */}
            <div className="mb-8">
                <GlassCard>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">
                        Button Styles
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <button className="glass-button">Primary Button</button>
                        <button className="glass-button-secondary">Secondary Button</button>
                        <button className="glass-button-icon">
                            <BookOpen size={20} />
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* Input Styles */}
            <div className="mb-8">
                <GlassCard>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">
                        Input Styles
                    </h2>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter your name..."
                            className="glass-input w-full"
                        />
                        <input
                            type="email"
                            placeholder="Enter your email..."
                            className="glass-input w-full"
                        />
                        <textarea
                            placeholder="Enter your message..."
                            rows={4}
                            className="glass-input w-full resize-none"
                        />
                    </div>
                </GlassCard>
            </div>

            {/* Color Palette */}
            <div>
                <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">
                    Orange Fusion Color Palette
                </h2>
                <GlassCard>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                            <div key={shade} className="text-center">
                                <div
                                    className={`h-16 rounded-lg mb-2 bg-primary-${shade} border border-white/20`}
                                />
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                    primary-{shade}
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default DesignSystemDemo;
