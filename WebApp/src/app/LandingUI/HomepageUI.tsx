"use client";

import { useEffect, useState } from "react";
import Navbar from "../UI Components/Nav";
import Form from "../UI Components/Form";
import AboutUs from "../UI Components/About";
import Announcements from "../UI Components/Announcements";
import Collections from "../UI Components/Collection";
import Features from "../UI Components/Features";
import Footer from "../UI Components/Footer";


type SpecimenTypeStat = {
    type: string;
    count: number;
    imageUrl?: string | null;
};

type HomepageStats = {
    publishedSpecimens: number;
    carolinianCount: number;
    totalSpecimens: number;
    collectionCategories: number;
    specimenTypes: SpecimenTypeStat[];
    announcements: {
        announcement_id?: number;
        title: string;
        description: string;
        image_urls: string[];
        links: { label: string; url: string }[];
        created_at: string | null;
        created_by_email: string;
        created_by_role: string;
    }[];
};

const defaultStats: HomepageStats = {
    publishedSpecimens: 0,
    carolinianCount: 0,
    totalSpecimens: 0,
    collectionCategories: 0,
    specimenTypes: [],
    announcements: [],
};

export default function Homepage() {
    const [stats, setStats] = useState<HomepageStats>(defaultStats);

    useEffect(() => {
        const fetchHomepageStats = async () => {
            try {
                const response = await fetch("/API/home/stats", { cache: "no-store" });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.error || "Failed to fetch homepage stats");
                }

                setStats({
                    publishedSpecimens: Number(data?.publishedSpecimens || 0),
                    carolinianCount: Number(data?.carolinianCount || 0),
                    totalSpecimens: Number(data?.totalSpecimens || 0),
                    collectionCategories: Number(data?.collectionCategories || 0),
                    specimenTypes: Array.isArray(data?.specimenTypes) ? data.specimenTypes : [],
                    announcements: Array.isArray(data?.announcements) ? data.announcements : [],
                });
            } catch {
                setStats(defaultStats);
            }
        };

        fetchHomepageStats();
    }, []);

    return (
        <>
            <Navbar />
            <Form />
            <AboutUs
                totalSpecimens={stats.publishedSpecimens}
                carolinianCount={stats.carolinianCount}
            />
            <Announcements announcements={stats.announcements} />
            <Collections
                totalSpecimens={stats.totalSpecimens}
                collectionCategories={stats.collectionCategories}
                specimenTypes={stats.specimenTypes}
            />
            <Features />
            <Footer />
        </>
    );
}
