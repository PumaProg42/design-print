import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SaveLabelParams {
  name: string;
  jsonData: any;
  labelWidth: number;
  labelHeight: number;
  dpi: number;
}

export const useLabels = () => {
  const { toast } = useToast();

  const saveLabel = async ({
    name,
    jsonData,
    labelWidth,
    labelHeight,
    dpi,
  }: SaveLabelParams): Promise<boolean> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Napaka",
          description: "Morate biti prijavljeni za shranjevanje etiket.",
          variant: "destructive",
        });
        return false;
      }

      // Check if label with same name already exists for this user
      const { data: existingLabels, error: fetchError } = await supabase
        .from("labels")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", name);

      if (fetchError) throw fetchError;

      if (existingLabels && existingLabels.length > 0) {
        // Update existing label
        const { error: updateError } = await supabase
          .from("labels")
          .update({
            json_data: jsonData,
            label_width: labelWidth,
            label_height: labelHeight,
            dpi: dpi,
          })
          .eq("id", existingLabels[0].id);

        if (updateError) throw updateError;

        toast({
          title: "Etiketa posodobljena",
          description: `Etiketa "${name}" je bila uspešno posodobljena.`,
        });
      } else {
        // Create new label
        const { error: insertError } = await supabase
          .from("labels")
          .insert({
            user_id: user.id,
            name: name,
            json_data: jsonData,
            label_width: labelWidth,
            label_height: labelHeight,
            dpi: dpi,
          });

        if (insertError) throw insertError;

        toast({
          title: "Etiketa shranjena",
          description: `Etiketa "${name}" je bila uspešno shranjena.`,
        });
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Napaka pri shranjevanju",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  return { saveLabel };
};
