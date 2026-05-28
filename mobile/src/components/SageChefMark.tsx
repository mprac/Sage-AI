/** Sage's chef mark — the brand illustration. Used on the launch splash and inside the Sage avatar
 *  ring; NOT in nav headers/menus (those keep the lightweight chef-hat glyph). Square; preserves the
 *  artwork's aspect ratio. */
import React from 'react';
import { Image } from 'react-native';

const SAGE_CHEF = require('../../assets/images/sage_chef_final.png');

export function SageChefMark({ size }: { size: number }) {
  return <Image source={SAGE_CHEF} style={{ width: size, height: size }} resizeMode="contain" />;
}
