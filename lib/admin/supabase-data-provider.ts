import { DataProvider, GetListParams, GetOneParams, GetManyParams, GetManyReferenceParams, CreateParams, UpdateParams, UpdateManyParams, DeleteParams, DeleteManyParams } from 'react-admin';
import { createClient } from '@/lib/supabase/client';

const supabaseDataProvider = (): DataProvider => {
  const supabase = createClient();

  return {
    getList: async (resource: string, params: GetListParams) => {
      const { page, perPage } = params.pagination;
      const { field, order } = params.sort;
      const { filter } = params;

      let query = supabase.from(resource).select('*', { count: 'exact' });

      // Apply filters
      Object.keys(filter).forEach(key => {
        if (filter[key] !== undefined && filter[key] !== '') {
          if (key.endsWith('_gte')) {
            const field = key.replace('_gte', '');
            query = query.gte(field, filter[key]);
          } else if (key.endsWith('_lte')) {
            const field = key.replace('_lte', '');
            query = query.lte(field, filter[key]);
          } else if (key.endsWith('_like')) {
            const field = key.replace('_like', '');
            query = query.ilike(field, `%${filter[key]}%`);
          } else {
            query = query.eq(key, filter[key]);
          }
        }
      });

      // Apply sorting
      query = query.order(field, { ascending: order === 'ASC' });

      // Apply pagination
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: data || [],
        total: count || 0,
      };
    },

    getOne: async (resource: string, params: GetOneParams) => {
      const { data, error } = await supabase
        .from(resource)
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return { data };
    },

    getMany: async (resource: string, params: GetManyParams) => {
      const { data, error } = await supabase
        .from(resource)
        .select('*')
        .in('id', params.ids);

      if (error) {
        throw new Error(error.message);
      }

      return { data: data || [] };
    },

    getManyReference: async (resource: string, params: GetManyReferenceParams) => {
      const { page, perPage } = params.pagination;
      const { field, order } = params.sort;
      const { filter, target, id } = params;

      let query = supabase
        .from(resource)
        .select('*', { count: 'exact' })
        .eq(target, id);

      // Apply additional filters
      Object.keys(filter).forEach(key => {
        if (filter[key] !== undefined) {
          query = query.eq(key, filter[key]);
        }
      });

      // Apply sorting
      query = query.order(field, { ascending: order === 'ASC' });

      // Apply pagination
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: data || [],
        total: count || 0,
      };
    },

    create: async (resource: string, params: CreateParams) => {
      const { data, error } = await supabase
        .from(resource)
        .insert([params.data])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return { data };
    },

    update: async (resource: string, params: UpdateParams) => {
      const { id, ...updateData } = params.data;
      
      const { data, error } = await supabase
        .from(resource)
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return { data };
    },

    updateMany: async (resource: string, params: UpdateManyParams) => {
      const { data, error } = await supabase
        .from(resource)
        .update(params.data)
        .in('id', params.ids)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      return { data: params.ids };
    },

    delete: async (resource: string, params: DeleteParams) => {
      const { data, error } = await supabase
        .from(resource)
        .delete()
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return { data };
    },

    deleteMany: async (resource: string, params: DeleteManyParams) => {
      const { error } = await supabase
        .from(resource)
        .delete()
        .in('id', params.ids);

      if (error) {
        throw new Error(error.message);
      }

      return { data: params.ids };
    },
  };
};

export default supabaseDataProvider;