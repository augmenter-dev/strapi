import type { Schema, Struct } from '@strapi/strapi';

export interface SharedCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_ctas';
  info: {
    displayName: 'CTA';
  };
  attributes: {
    title: Schema.Attribute.String;
    url: Schema.Attribute.String;
  };
}

export interface SharedHero extends Struct.ComponentSchema {
  collectionName: 'components_shared_heroes';
  info: {
    displayName: 'Hero';
  };
  attributes: {
    content: Schema.Attribute.RichText;
    cta: Schema.Attribute.Component<'shared.cta', true>;
    title: Schema.Attribute.String;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedRichTextSection extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_text_sections';
  info: {
    displayName: 'Rich text section';
  };
  attributes: {
    CTA: Schema.Attribute.Component<'shared.cta', true>;
    text: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
    title: Schema.Attribute.String;
  };
}

export interface SharedTicketType extends Struct.ComponentSchema {
  collectionName: 'components_shared_ticket_types';
  info: {
    displayName: 'Ticket type';
  };
  attributes: {
    name: Schema.Attribute.String;
    price: Schema.Attribute.Decimal;
    ticket_type_status: Schema.Attribute.Enumeration<
      ['selling', 'available_soon', 'sold_out']
    >;
  };
}

export interface SharedTicketing extends Struct.ComponentSchema {
  collectionName: 'components_shared_ticketings';
  info: {
    displayName: 'Ticketing';
  };
  attributes: {
    CTA: Schema.Attribute.Component<'shared.cta', true>;
    text_after: Schema.Attribute.RichText;
    text_before: Schema.Attribute.RichText;
    ticketing_url: Schema.Attribute.String;
    tickets: Schema.Attribute.Component<'shared.ticket-type', true>;
    title: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.cta': SharedCta;
      'shared.hero': SharedHero;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.rich-text-section': SharedRichTextSection;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'shared.ticket-type': SharedTicketType;
      'shared.ticketing': SharedTicketing;
    }
  }
}
