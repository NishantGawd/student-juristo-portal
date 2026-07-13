"use client";

import {
  Briefcase,
  Building2,
  ExternalLink,
  GraduationCap,
  Newspaper,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LearnTab() {
  const news = [
    {
      title: "Supreme Court's landmark ruling on Electoral Bonds",
      date: "Today",
      tag: "Constitutional Law",
      type: "news",
    },
    {
      title: "New Criminal Laws 2024: Complete Breakdown",
      date: "Yesterday",
      tag: "Criminal Law",
      type: "capsule",
    },
    {
      title: "Monthly GK Capsule - May 2024",
      date: "1 week ago",
      tag: "Current Affairs",
      type: "capsule",
    },
  ];

  const nlus = [
    {
      name: "NLSIU Bangalore",
      nirf: 1,
      package: "16-20 LPA",
      recruiters: ["Cyril Amarchand", "Khaitan & Co"],
    },
    {
      name: "NALSAR Hyderabad",
      nirf: 2,
      package: "15-18 LPA",
      recruiters: ["Trilegal", "AZB & Partners"],
    },
    {
      name: "NLIU Bhopal",
      nirf: 3,
      package: "12-15 LPA",
      recruiters: ["L&L Partners", "Shardul Amarchand"],
    },
  ];

  const careers = [
    {
      title: "Corporate Law (Tier-1 Firms)",
      desc: "High-paced, high-reward. M&A, Capital Markets, PE.",
      icon: <Building2 className="h-6 w-6 text-blue-500" />,
    },
    {
      title: "Litigation",
      desc: "The classic court practice. Argue cases, build your own chamber.",
      icon: <Scale className="h-6 w-6 text-emerald-500" />,
    },
    {
      title: "Judiciary",
      desc: "State judicial services. Become a Civil Judge.",
      icon: <GraduationCap className="h-6 w-6 text-amber-500" />,
    },
  ];

  return (
    <div className="fade-in slide-in-from-bottom-4 flex animate-in flex-col gap-6 duration-500">
      <Tabs className="w-full" defaultValue="ca">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger className="flex items-center gap-2" value="ca">
            <Newspaper className="h-4 w-4" /> Current Affairs
          </TabsTrigger>
          <TabsTrigger className="flex items-center gap-2" value="careers">
            <Briefcase className="h-4 w-4" /> Career Explorer
          </TabsTrigger>
        </TabsList>

        {/* Current Affairs Tab */}
        <TabsContent className="space-y-6 pt-4" value="ca">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-2xl">Daily Legal News & GK</h2>
            <Button size="sm" variant="outline">
              Download Monthly PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {news.map((item) => (
              <Card
                className="group cursor-pointer transition-all hover:border-primary/50"
                key={item.title}
              >
                <CardHeader className="pb-3">
                  <div className="mb-2 flex items-start justify-between">
                    <Badge
                      variant={
                        item.type === "capsule" ? "default" : "secondary"
                      }
                    >
                      {item.tag}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {item.date}
                    </span>
                  </div>
                  <CardTitle className="text-lg transition-colors group-hover:text-primary">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    className="flex items-center gap-1 px-0"
                    variant="link"
                  >
                    Read Summary <ExternalLink className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Careers Tab */}
        <TabsContent className="space-y-8 pt-4" value="careers">
          <div className="space-y-2">
            <h2 className="font-bold text-2xl">
              Why Law? Explore Career Paths
            </h2>
            <p className="text-muted-foreground">
              Discover where a degree from a top NLU can take you.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {careers.map((career) => (
              <Card key={career.title}>
                <CardHeader>
                  <div className="mb-2 w-fit rounded-lg bg-muted p-3">
                    {career.icon}
                  </div>
                  <CardTitle className="text-lg">{career.title}</CardTitle>
                  <CardDescription>{career.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-xl">Top NLU Profiles & Placements</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {nlus.map((nlu) => (
                <Card className="overflow-hidden" key={nlu.name}>
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-emerald-500" />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{nlu.name}</CardTitle>
                      <Badge variant="outline">NIRF #{nlu.nirf}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-muted-foreground">Avg Package</span>
                      <span className="font-bold">{nlu.package}</span>
                    </div>
                    <div className="pt-1">
                      <span className="mb-1 block text-muted-foreground">
                        Top Recruiters:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {nlu.recruiters.map((r) => (
                          <Badge
                            className="text-[10px]"
                            key={r}
                            variant="secondary"
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
