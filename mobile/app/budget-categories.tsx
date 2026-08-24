import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../src/auth";
import { BottomNav, EmptyState, ErrorState, Header, LoadingState, Screen } from "../src/components/Screen";
import { SelectField, SubmitButton } from "../src/components/NativeForm";
import { createBudgetCategory, createBudgetSubcategory, getBudgetCategories, updateBudgetCategory, updateBudgetSubcategory } from "../src/lib/api";
import { text } from "../src/lib/read";
import { colors, spacing } from "../src/theme";

type Category = Record<string, unknown> & { subcategories?: Array<Record<string, unknown>> };

export default function BudgetCategories() {
  const { role, session } = useAuth();
  const client = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categorySort, setCategorySort] = useState("0");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [subcategorySort, setSubcategorySort] = useState("0");
  const query = useQuery({ queryKey: ["budget-categories", "all"], queryFn: () => getBudgetCategories({ includeInactive: "true" }), enabled: Boolean(role) });
  if (!role) return null;

  const canManage = session?.permissions.includes("BUDGET_CATEGORY_MANAGE") ?? false;
  const categories = (query.data?.categories ?? []) as Category[];
  const activeCategoryOptions = categories.filter((item) => Number(item.isActive) === 1).map((item) => ({ label: text(item, "name"), value: text(item, "id") }));
  const refresh = () => client.invalidateQueries({ queryKey: ["budget-categories"] });
  const resetCategory = () => { setCategoryId(""); setCategoryName(""); setCategorySort("0"); };
  const resetSubcategory = () => { setSubcategoryId(""); setSubcategoryCategoryId(""); setSubcategoryName(""); setSubcategorySort("0"); };
  const editCategory = (item: Category) => { setCategoryId(text(item, "id")); setCategoryName(text(item, "name")); setCategorySort(String(item.sortOrder ?? 0)); };
  const editSubcategory = (item: Record<string, unknown>) => { setSubcategoryId(text(item, "id")); setSubcategoryCategoryId(text(item, "categoryId")); setSubcategoryName(text(item, "name")); setSubcategorySort(String(item.sortOrder ?? 0)); };

  async function saveCategory() {
    if (!categoryName.trim()) return Alert.alert("Nama diperlukan", "Masukkan nama kategori anggaran.");
    try {
      if (categoryId) await updateBudgetCategory({ id: categoryId, name: categoryName, sortOrder: Number(categorySort) || 0, isActive: true });
      else await createBudgetCategory({ name: categoryName, sortOrder: Number(categorySort) || 0 });
      resetCategory(); await refresh();
    } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Coba lagi."); }
  }

  async function saveSubcategory() {
    if (!subcategoryCategoryId || !subcategoryName.trim()) return Alert.alert("Lengkapi data", "Pilih kategori dan masukkan nama subkategori.");
    try {
      if (subcategoryId) await updateBudgetSubcategory({ id: subcategoryId, categoryId: subcategoryCategoryId, name: subcategoryName, sortOrder: Number(subcategorySort) || 0, isActive: true });
      else await createBudgetSubcategory({ categoryId: subcategoryCategoryId, name: subcategoryName, sortOrder: Number(subcategorySort) || 0 });
      resetSubcategory(); await refresh();
    } catch (error) { Alert.alert("Tidak dapat menyimpan", error instanceof Error ? error.message : "Coba lagi."); }
  }

  async function toggleCategory(item: Category) {
    try { await updateBudgetCategory({ id: text(item, "id"), name: text(item, "name"), sortOrder: Number(item.sortOrder ?? 0), isActive: Number(item.isActive) !== 1 }); await refresh(); }
    catch (error) { Alert.alert("Tidak dapat memperbarui", error instanceof Error ? error.message : "Coba lagi."); }
  }

  async function toggleSubcategory(item: Record<string, unknown>) {
    try { await updateBudgetSubcategory({ id: text(item, "id"), categoryId: text(item, "categoryId"), name: text(item, "name"), sortOrder: Number(item.sortOrder ?? 0), isActive: Number(item.isActive) !== 1 }); await refresh(); }
    catch (error) { Alert.alert("Tidak dapat memperbarui", error instanceof Error ? error.message : "Coba lagi."); }
  }

  return <><Header role={role} title="Kategori Anggaran" subtitle="Master kategori dan subkategori alokasi" /><Screen>
    {canManage ? <><View style={styles.form}>
      <Text style={styles.formTitle}>{categoryId ? "Ubah Kategori" : "Kategori Baru"}</Text>
      <TextInput value={categoryName} onChangeText={setCategoryName} placeholder="Nama kategori" placeholderTextColor={colors.textMuted} style={styles.input} />
      <TextInput value={categorySort} onChangeText={setCategorySort} keyboardType="numeric" placeholder="Urutan" placeholderTextColor={colors.textMuted} style={styles.input} />
      <SubmitButton label={categoryId ? "Simpan Kategori" : "Tambah Kategori"} loading={false} onPress={() => void saveCategory()} />
      {categoryId ? <Pressable onPress={resetCategory}><Text style={styles.cancel}>Batal ubah kategori</Text></Pressable> : null}
    </View><View style={styles.form}>
      <Text style={styles.formTitle}>{subcategoryId ? "Ubah Subkategori" : "Subkategori Baru"}</Text>
      <SelectField label="Kategori" value={subcategoryCategoryId} onChange={setSubcategoryCategoryId} options={activeCategoryOptions} />
      <TextInput value={subcategoryName} onChangeText={setSubcategoryName} placeholder="Nama subkategori" placeholderTextColor={colors.textMuted} style={styles.input} />
      <TextInput value={subcategorySort} onChangeText={setSubcategorySort} keyboardType="numeric" placeholder="Urutan" placeholderTextColor={colors.textMuted} style={styles.input} />
      <SubmitButton label={subcategoryId ? "Simpan Subkategori" : "Tambah Subkategori"} loading={false} onPress={() => void saveSubcategory()} />
      {subcategoryId ? <Pressable onPress={resetSubcategory}><Text style={styles.cancel}>Batal ubah subkategori</Text></Pressable> : null}
    </View></> : null}
    {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="Kategori anggaran tidak dapat dimuat." onRetry={() => query.refetch()} /> : categories.length ? categories.map((item) => <View key={text(item, "id")} style={styles.category}>
      <Pressable onPress={() => canManage && editCategory(item)} style={styles.categoryRow}>
        <View><Text style={styles.name}>{text(item, "name")}</Text><Text style={styles.meta}>Urutan {text(item, "sortOrder", "0")} · {Number(item.isActive) === 1 ? "Aktif" : "Nonaktif"}</Text></View>
        {canManage ? <Pressable onPress={() => void toggleCategory(item)}><Text style={Number(item.isActive) === 1 ? styles.deactivate : styles.activate}>{Number(item.isActive) === 1 ? "Nonaktifkan" : "Aktifkan"}</Text></Pressable> : null}
      </Pressable>
      {(item.subcategories ?? []).map((subcategory) => <Pressable key={text(subcategory, "id")} onPress={() => canManage && editSubcategory(subcategory)} style={styles.subcategory}>
        <View><Text style={styles.subcategoryName}>{text(subcategory, "name")}</Text><Text style={styles.meta}>{Number(subcategory.isActive) === 1 ? "Aktif" : "Nonaktif"}</Text></View>
        {canManage ? <Pressable onPress={() => void toggleSubcategory(subcategory)}><Text style={Number(subcategory.isActive) === 1 ? styles.deactivate : styles.activate}>{Number(subcategory.isActive) === 1 ? "Nonaktifkan" : "Aktifkan"}</Text></Pressable> : null}
      </Pressable>)}
    </View>) : <EmptyState message="Belum ada kategori anggaran." />}
  </Screen><BottomNav current="budgets" role={role} /></>;
}

const styles = StyleSheet.create({ form: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, gap: spacing.sm, padding: spacing.md }, formTitle: { color: colors.text, fontSize: 13, fontWeight: "900" }, input: { borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, minHeight: 44, paddingHorizontal: 12 }, cancel: { color: colors.textMuted, fontSize: 11, textAlign: "center" }, category: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, overflow: "hidden" }, categoryRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: spacing.md }, subcategory: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: 10 }, name: { color: colors.text, fontSize: 13, fontWeight: "900" }, subcategoryName: { color: colors.text, fontSize: 12, fontWeight: "800" }, meta: { color: colors.textMuted, fontSize: 10, marginTop: 3 }, deactivate: { color: colors.danger, fontSize: 10, fontWeight: "900" }, activate: { color: colors.success, fontSize: 10, fontWeight: "900" } });
