/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import fetch from 'cross-fetch';

const api = "http://localhost:3000/api";
const postSizeX = 0.3;
const postSizeY = 0.3;
const canvasSizeX = 500;
const canvasSizeY = 400;
const containerSizeX = 1.5;
const containerSizeY = 1;

export default class PostItApp {
	private refreshButton: MRE.Actor = null;
	private container: MRE.Actor = null;
	private assets: MRE.AssetContainer;

	constructor(private context: MRE.Context) {
		this.context.onStarted(() => this.started());
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private started() {
		// set up somewhere to store loaded assets (meshes, textures, animations, gltfs, etc.)
		this.assets = new MRE.AssetContainer(this.context);

		//RefreshButton
		const buttonMesh = this.assets.createBoxMesh('button', 0.25, 0.25, 0.01);
		this.refreshButton = MRE.Actor.Create(this.context, {
			actor: {
				name: "RefreshButton",
				appearance: { meshId: buttonMesh.id },
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: { 
						position: { x: -1.2, y: 0, z: 0 } 
					}
				}
			}
		});
		const buttonBehavior = this.refreshButton.setBehavior(MRE.ButtonBehavior);
		buttonBehavior.onClick(_ => {
			this.refresh();
		});
		this.refresh();
	}

	private hexToRgb(hex: string) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/u.exec(hex);
		return result ? new MRE.Color4(
			parseInt(result[1], 16)/ 255,
			parseInt(result[2], 16)/ 255,
			parseInt(result[3], 16)/ 255,
			1): null;
	}
	/**
 	* Show a menu of hat selections.
 	*/
	private async refresh() {
		if (this.container !== null)
		{
			this.container.destroy();
			this.container = null;
		}
		// Create a parent object for all the menu items.
		const containerMesh = this.assets.createBoxMesh('button', containerSizeX, containerSizeY, 0.01);
		this.container = MRE.Actor.Create(this.context, {
			actor: {
				name: "Container",
				appearance: { meshId: containerMesh.id },
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: { 
						position: { x: 0, y: 0, z: 0 } 
					}
				}
			}
		});
		// Create menu button
		const postitMesh = this.assets.createBoxMesh('button', postSizeX, postSizeY, 0.01);

		const rawResponse = await fetch(`${api}/post`, {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			}
		});
		const content = await rawResponse.json();
		const postits = content;

		// Loop over the hat database, creating a menu item for each entry.
		for (const post of postits) {

			const postitMaterial = this.assets.createMaterial(post.id, {color: this.hexToRgb(post.color)});
			// Create a clickable button.
			const button = MRE.Actor.Create(this.context, {
				actor: {
					parentId: this.container.id,
					name: post.id,
					appearance: { meshId: postitMesh.id },
					collider: { geometry: { shape: MRE.ColliderType.Auto } },
					transform: {
						local: { 
							position: { 
								x: (post.position.x / canvasSizeX) - containerSizeX / 2 * 0.85, 
								y: (-post.position.y / canvasSizeY) + containerSizeY / 2 * 0.85, 
								z: -0.01
							} 
						}
					}
				}
			});

			button.appearance.material = postitMaterial;

			// Set a click handler on the button.
			button.setBehavior(MRE.ButtonBehavior)
				.onClick(user => {
					
				});

			// Create a label for the menu entry.
			MRE.Actor.Create(this.context, {
				actor: {
					parentId: button.id,
					name: 'label',
					text: {
						contents: post.text,
						height: 0.5,
						anchor: MRE.TextAnchorLocation.TopLeft
					},
					transform: {
						local: { 
							scale: {x: 0.1, y: 0.1, z: 0.1},
							position: { x: -postSizeX/2 * 0.9, y: postSizeY/2, z: -0.01 } 
						}
					}
				}
			});
		}

	}
}
