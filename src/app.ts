/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { TextFontFamily } from '@microsoft/mixed-reality-extension-sdk';
import fetch from 'cross-fetch';

const api = "https://postitaltspace.herokuapp.com/api";
//const api = "http://localhost:3000/api";
const canvasSizeX = 1000;
const canvasSizeY = 500;
const resolution = 600;

export default class PostItApp {
	private refreshButton: MRE.Actor = null;
	private container: MRE.Actor = null;
	private containerBackground: MRE.Actor = null;
	private assets: MRE.AssetContainer;

	constructor(private context: MRE.Context, private params: MRE.ParameterSet) {
		this.context.onStarted(() => this.started());
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private async started() {
		const colorWhite = new MRE.Color4(1,1,1,1);
		const colorBlue = new MRE.Color4(0.20,0.51,0.92,1);
		// set up somewhere to store loaded assets (meshes, textures, animations, gltfs, etc.)
		this.assets = new MRE.AssetContainer(this.context);
		const btnMaterial = this.assets.createMaterial("btn", {color: colorBlue});

		//RefreshButton
		const buttonMesh = await this.assets.loadGltf('refreshbutton.glb', 'box');
		this.refreshButton = MRE.Actor.CreateFromPrefab(this.context, {
			firstPrefabFrom: buttonMesh,
			actor: {
				name: "RefreshButton",
				transform: {
					local: { 
						position: { x: -0.12, y: -(canvasSizeY / resolution) / 2, z: 0 },
						scale: {x: 0.15, y: 0.15, z: 0.15}
					}
				}
			}
		});
		const buttonBehavior = this.refreshButton.setBehavior(MRE.ButtonBehavior);
		buttonBehavior.onClick(_ => {
			this.refresh();
		});
		const backgroundButtonMesh = this.assets.createBoxMesh("box", 0.06, 0.06, 0.01);
		const backgroundButton = MRE.Actor.Create(this.context, {
			actor: {
				appearance: {
					meshId: backgroundButtonMesh.id,
					materialId: btnMaterial.id
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: {
						position: { x: -0.12, y: this.refreshButton.transform.local.position.y + 0.1, z: 0}
					}
				}
			}
		})
		btnMaterial.color = colorBlue;
		const backgroundButtonBehavior = backgroundButton.setBehavior(MRE.ButtonBehavior);
		backgroundButtonBehavior.onClick(_ => {
			if (this.containerBackground !== null)
			{
				this.containerBackground.appearance.enabled = !this.containerBackground.appearance.enabled;
				btnMaterial.color = this.containerBackground.appearance.enabled ? colorBlue : colorWhite;
			}
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
		var showingBackground = true;
		if (this.container !== null)
		{
			showingBackground = this.containerBackground.appearance.enabled as boolean;
			this.container.destroy();
			this.container = null;
		}
		// Create a parent object for all the menu items.
		const sizeX = canvasSizeX / resolution;
		const sizeY = canvasSizeY / resolution;
		this.container = MRE.Actor.Create(this.context, {
			actor: {
				name: "Container",
				transform: {
					local: { 
						position: { x: 0, y: 0, z: 0 } 
					}
				}
			}
		});
		const containerMesh = this.assets.createBoxMesh('button', sizeX, sizeY, 0.01);
		this.containerBackground = MRE.Actor.Create(this.context, {
			actor: {
				name: "Container",
				parentId: this.container.id,
				appearance: { 
					meshId: containerMesh.id,
					enabled: showingBackground
				},
				collider: { geometry: { shape: MRE.ColliderType.Auto } },
				transform: {
					local: { 
						position: { x: sizeX/2, y: -sizeY/2, z: 0 } 
					}
				}
			}
		});
		// Create menu button
		const section = this.params.section;
		const rawResponse = await fetch(`${api}/post?section=${section}`, {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			}
		});
		const content = await rawResponse.json();
		const postits = content;
		const gltf = await this.assets.loadGltf('postit.glb', 'box');
		//gltf.forEach(g=>console.log(g.mesh?.id));
		const texture = gltf[2].material.mainTexture;

		// Loop over the hat database, creating a menu item for each entry.
		for (const post of postits) {

			const postSizeX = post.size.x/resolution;
			const postSizeY = post.size.y/resolution;
			const color = this.hexToRgb(post.color)
			// Create a clickable button.
			const button = MRE.Actor.Create(this.context, {
				actor: {
					parentId: this.container.id,
					name: post.id,
					collider: { 
						geometry: 
						{ 
							shape: MRE.ColliderType.Box, 
							size: {
								x: 1, 
								y: 1, 
								z: 0.01
							} 
						} 
					},
					transform: {
						local: { 
							position: { 
								x: (post.position.x / resolution) + postSizeX / 2, 
								y: (-post.position.y / resolution) - postSizeY / 2, 
								z: -0.01
							},
							scale: {
								x: postSizeX,
								y: postSizeY,
								z: (postSizeX + postSizeY) / 2
							}
						}
					}
				}
			});
			if (post.type === "postit")
			{
				const postitMaterial = this.assets.createMaterial(post.id, {
					color: color,
					mainTextureId: texture.id
				});
				MRE.Actor.Create(this.context, {
					actor: {
						appearance: { meshId: gltf[1].mesh.id, materialId: postitMaterial.id },
						parentId: button.id,
						transform: {
							local: { 
								scale: {
									x: 0.5,
									y: 0.5,
									z: 0.5
								},
								position: {
									x: 0,
									y: 0,
									z: -0.04
								}
							}
						}
					}
				})
				MRE.Actor.Create(this.context, {
					actor: {
						parentId: button.id,
						name: 'label',
						text: {
							contents: post.text,
							height: 0.5,
							anchor: MRE.TextAnchorLocation.TopLeft,
							font: TextFontFamily.Cursive
						},
						transform: {
							local: { 
								scale: {x: 0.28, y: 0.28, z: 0.28},
								position: { x: -0.4, y: 0.4, z: -0.025 }
							}
						}
					}
				});
			}
			if (post.type === "text"){
				
				MRE.Actor.Create(this.context, {
					actor: {
						parentId: button.id,
						name: 'label',
						text: {
							contents: post.text,
							height: 0.5,
							anchor: MRE.TextAnchorLocation.TopLeft,
							font: TextFontFamily.Cursive,
							color: color
						},
						transform: {
							local: { 
								scale: {x: 0.5, y: 0.5, z: 0.5},
								position: { x: -0.3, y: 0.3, z: -0.02 }
							}
						}
					}
				});
			}
			

			// Set a click handler on the button.
			button.setBehavior(MRE.ButtonBehavior)
				.onClick(user => {
					user.prompt(`${post.text}\n\n${post.description}`);
				});

		}

	}
}
