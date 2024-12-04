"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import DeleteAIScreeningFromDB from "@/app/actions/delete-ai-screening";
import { DealType } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";

interface AIReasoningProps {
  screeningId: string;
  title: string;
  dealId: string;
  dealType: DealType;
  explanation: string;
  sentiment: string;
}

export default function AIReasoning({
  title,
  explanation,
  sentiment,
  screeningId,
  dealId,
  dealType,
}: AIReasoningProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge
          className={cn({
            "": sentiment === "positive",
          })}
        >
          {sentiment}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {explanation}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="destructive"
          onClick={async () => {
            // delete SIM
            startTransition(async () => {
              const response = await DeleteAIScreeningFromDB(
                screeningId,
                dealType,
                dealId,
              );
              if (response.type === "success") {
                toast({
                  title: "SIM deleted successfully",
                  description: "The SIM has been deleted successfully",
                });
              }

              if (response.type === "error") {
                toast({
                  title: "Error deleting SIM",
                  description: response.message,
                  variant: "destructive",
                });
              }
            });
          }}
          disabled={isPending}
          aria-label="Delete SIM"
        >
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </CardFooter>
    </Card>
  );
}
