import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Get the current product
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, name, description, category_id, price, unit, categories(name)")
      .eq("id", product_id)
      .single();

    if (pErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active products (excluding current)
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, name, description, category_id, price, unit, image_url, stock, mrp, max_retail_qty")
      .eq("is_active", true)
      .neq("id", product_id)
      .limit(50);

    if (!allProducts || allProducts.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: return same-category products
      const sameCat = allProducts
        .filter((p) => p.category_id === product.category_id)
        .slice(0, 4);
      return new Response(JSON.stringify({ suggestions: sameCat }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productList = allProducts
      .map((p) => `${p.id}|${p.name}|${p.price}|${p.unit}`)
      .join("\n");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "You are a grocery store product recommendation engine. Given a product, suggest the most similar/complementary products from the available list. Return ONLY the product IDs as a JSON array of strings, max 4 items. Consider: same category, complementary items (e.g. bread→butter), similar price range, and what customers typically buy together.",
            },
            {
              role: "user",
              content: `Current product: "${product.name}" (${product.unit}, ₹${product.price}, category: ${(product as any).categories?.name || "unknown"})\n\nAvailable products:\n${productList}\n\nReturn JSON array of up to 4 product IDs that are most similar or complementary.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_products",
                description: "Return similar product IDs",
                parameters: {
                  type: "object",
                  properties: {
                    product_ids: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 4,
                    },
                  },
                  required: ["product_ids"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_products" },
          },
        }),
      }
    );

    if (!response.ok) {
      // Fallback to category-based
      const sameCat = allProducts
        .filter((p) => p.category_id === product.category_id)
        .slice(0, 4);
      return new Response(JSON.stringify({ suggestions: sameCat }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    let suggestedIds: string[] = [];

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const args = JSON.parse(toolCall.function.arguments);
        suggestedIds = args.product_ids || [];
      }
    } catch {
      // Fallback
      const sameCat = allProducts
        .filter((p) => p.category_id === product.category_id)
        .slice(0, 4);
      return new Response(JSON.stringify({ suggestions: sameCat }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggestions = allProducts.filter((p) =>
      suggestedIds.includes(p.id)
    );

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-similar-products error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", suggestions: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
