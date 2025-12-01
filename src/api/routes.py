"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Product, Collection, Size, Color, Favorites, Stock, Order, SupportTicket, Message
from api.utils import generate_sitemap, APIException
# Token
from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import jwt_required

from datetime import datetime
import stripe
import os


stripe.api_key = os.getenv("STRIPE_SECRET_KEY")



api = Blueprint('api', __name__)


from flask import request, jsonify

from flask import request, jsonify

from sqlalchemy import select, exists

@api.route('/products/filter', methods=['GET'])
def filter_products():
    product_id = request.args.get('product_id')
    collection_names = request.args.getlist('collection_names[]')
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')
    size_ids = request.args.getlist('size_ids[]')
    color_ids = request.args.getlist('color_ids[]')
    in_stock = request.args.get('in_stock')
    print('@@@@@@@@@@@@@@@@')
    print(product_id)
    # Query the products based on the filter criteria
    query = Product.query

    if product_id:
        query = query.filter(Product.id == product_id)

    if collection_names:
        query = query.filter(Product.collections.any(Collection.name.in_(collection_names)))

    if min_price:
        query = query.filter(Product.price >= min_price)

    if max_price:
        query = query.filter(Product.price <= max_price)

    if size_ids:
        query = query.filter(Product.stock.any(Stock.size_id.in_(size_ids)))


    if color_ids:
        query = query.filter(Product.stock.any(Stock.color_id.in_(color_ids)))

    if in_stock:
        query = query.filter(ProductSizeColor.quantity > 0)

    products = query.all()

    # Serialize the products and return them as JSON
    serialized_products = [product.serialize() for product in products]
    return jsonify(serialized_products)

@api.route("/collections", methods=["GET"])
def get_all_collections():
    collections = Collection.query.all()
    return jsonify([collection.serialize() for collection in collections]), 200

@api.route("/sizes", methods=["GET"])
def get_all_sizes():
    sizes = Size.query.all()
    return jsonify([size.serialize() for size in sizes]), 200

@api.route("/products/price-range", methods=["GET"])
def get_price_range():
    # Get the maximum and minimum prices from the products
    max_price = db.session.query(db.func.max(Product.price)).scalar()
    min_price = db.session.query(db.func.min(Product.price)).scalar()

    # Return the price range as a JSON response
    return jsonify({"min_price": min_price, "max_price": max_price})

@api.route("/colors", methods=["GET"])
def get_all_colors():
    colors = Color.query.all()
    return jsonify([color.serialize() for color in colors]), 200

@api.route("/colors/<string:color_ids>", methods=["GET"])
def get_colors_by_ids(color_ids):
    try:
        color_ids_list = color_ids.split(',')  # Split the comma-separated list of color IDs

        # Fetch the colors based on the color IDs
        colors = Color.query.filter(Color.id.in_(color_ids_list)).all()

        # If colors is None, it means one or more colors were not found
        if not colors:
            return jsonify(error="One or more colors not found"), 404

        # Serialize the colors and return the response
        serialized_colors = [color.serialize() for color in colors]
        return jsonify(serialized_colors), 200

    except Exception as e:
        # Handle any errors that might occur during the API call
        print("Error fetching colors:", e)
        return jsonify(error="Internal Server Error"), 500

@api.route("/sizes/<string:color_ids>", methods=["GET"])
def get_sizes_by_ids(color_ids):
    try:
        size_ids_str = color_ids
        if size_ids_str is None:
            return jsonify(error="Size IDs not provided"), 400

        size_ids = [int(size_id) for size_id in size_ids_str.split(",")]
        sizes = Size.query.filter(Size.id.in_(size_ids)).all()

        # If sizes is None, it means one or more sizes were not found
        if not sizes:
            return jsonify(error="One or more sizes not found"), 404

        serialized_sizes = [size.serialize() for size in sizes]
        return jsonify(serialized_sizes), 200

    except Exception as e:
        # Handle any errors that might occur during the API call
        print("Error fetching sizes:", e)
        return jsonify(error="Internal Server Error"), 500

@api.route('/user', methods=['GET'])
@jwt_required()
def get_user():
    user_id = get_jwt_identity()
    user = User.query.filter_by(id = user_id).first()
    return jsonify(user.serialize()), 200

@api.route("/register", methods=["POST"])
def create_user():
    body = request.json
    print(body)
    user_already_exist = User.query.filter_by(email= body["email"]).first()
    if user_already_exist:
        return jsonify({"response": "Email already in use"}), 403
    if body["name"] and body["email"] and body["password"]:
        user = User(
            name = body ["name"],
            last_name = body["last_name"],
            email = body["email"],
            password = body["password"]
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({"response": "User created"}), 200
    else:
        return jsonify({"error": "Missing user details"}), 403

@api.route("/login", methods=["POST"])
def login_user():
    body = request.json
    user = User.query.filter_by(email= body["email"], password= body["password"]).first()
    if user:
        token = create_access_token(identity=user.id) # Token
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Error with credentials"}), 403

@api.route('/cart-item', methods=['POST'])
@jwt_required()
def add_cart_item():
    user_id = get_jwt_identity()
    product_id = request.json.get('product_id')
    color_id = request.json.get('color_id')
    size_id = request.json.get('size_id')
    quantity = request.json.get('quantity')

    if not all([product_id, color_id, size_id, quantity]):
        return jsonify(message='Missing product, color, size or quantity'), 400

    # 1. Verificar producto
    product = Product.query.get(product_id)
    if not product:
        return jsonify(message='Product not found'), 404

    # 2. Buscar stock específico del producto + talla + color
    stock_entry = Stock.query.filter_by(
        product_id=product_id,
        color_id=color_id,
        size_id=size_id
    ).first()

    if not stock_entry:
        return jsonify(message='Stock entry not found'), 404

    # 3. Validar cantidad disponible
    if quantity > stock_entry.quantity:
        return jsonify(
            message='Quantity exceeds available stock',
            available_stock=stock_entry.quantity
        ), 400

    # 4. Registrar en tabla Order (cart)
    order = Order(
        user_id=user_id,
        product_id=product_id,
        color=str(color_id),
        size=str(size_id),
        quantity=quantity,
        status='cart'
    )

    db.session.add(order)
    db.session.commit()

    return jsonify(message='Item added to cart successfully'), 201


@api.route('/favorites', methods=['POST'])
@jwt_required()
def create_favorite():
    user_id = get_jwt_identity()
    product_id = request.json.get('product_id')

    if not product_id:
        return jsonify(message='Product ID is required'), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify(message='Product not found'), 404

    favorite = Favorites.query.filter_by(user_id=user_id, product_id=product_id).first()
    if favorite:
        return jsonify(message='Favorite already exists'), 409

    favorite = Favorites(user_id=user_id, product_id=product_id)
    db.session.add(favorite)
    db.session.commit()

    return jsonify(message='Favorite created successfully'), 201

@api.route('/favorites/<int:product_id>', methods=['DELETE'])
@jwt_required() 
def delete_favorite(product_id):
    user_id = get_jwt_identity()

    favorite = Favorites.query.filter_by(user_id=user_id, product_id=product_id).first()
    if not favorite:
        return jsonify(message='Favorite not found'), 404

    db.session.delete(favorite)
    db.session.commit()

    return jsonify(message='Favorite deleted successfully'), 200

# TO FILL DATABASE
@api.route('/collections', methods=['POST'])
def create_collections():
    collections = request.get_json()

    if not isinstance(collections, list):
        return jsonify({'message': 'Invalid payload'}), 400

    created_collections = []
    for collection_data in collections:
        name = collection_data.get('name')
        img = collection_data.get('img')
        if name:
            collection = Collection(name=name, img=img)
            db.session.add(collection)
            created_collections.append(collection.serialize())

    db.session.commit()

    return jsonify(created_collections), 201

@api.route('/sizes', methods=['POST'])
def create_sizes():
    sizes_data = request.get_json()

    if not sizes_data:
        return jsonify(message='No sizes provided'), 400

    sizes = []
    for size_data in sizes_data:
        name = size_data.get('name')
        if not name:
            return jsonify(message='Invalid size data'), 400

        size = Size(name=name)
        db.session.add(size)
        sizes.append(size)

    db.session.commit()

    return jsonify(sizes=[size.serialize() for size in sizes]), 201

@api.route('/colors', methods=['POST'])
def create_colors():
    colors_data = request.get_json()

    if not colors_data:
        return jsonify(message='No colors provided'), 400

    colors = []
    for color_data in colors_data:
        name = color_data.get('name')
        rgb = color_data.get('rgb')

        if not name or not rgb:
            return jsonify(message='Invalid color data'), 400

        color = Color(name=name, rgb=rgb)
        db.session.add(color)
        colors.append(color)

    db.session.commit()

    return jsonify(colors=[color.serialize() for color in colors]), 201

@api.route('/products', methods=['POST'])
def create_products():
    products_data = request.get_json()

    if not products_data:
        return jsonify(message='No products provided'), 400

    products = []
    for product_data in products_data:
        name = product_data.get('name')
        img = product_data.get('img')
        description = product_data.get('description')
        collection_ids = product_data.get('collections')
        price = product_data.get('price')
        reference = product_data.get('reference')

        if not name or not img or not description or not collection_ids or not price or not reference:
            return jsonify(message='Invalid product data'), 400

        collections = Collection.query.filter(Collection.id.in_(collection_ids)).all()
        if len(collections) != len(collection_ids):
            return jsonify(message='Invalid collection IDs'), 400

        product = Product(
            name=name,
            img=img,
            description=description,
            collections=collections,
            price=price,
            reference=reference
        )
        db.session.add(product)
        products.append(product)

    db.session.commit()

    return jsonify(products=[product.serialize() for product in products]), 201

@api.route('/stocks', methods=['POST'])
def create_stock():
    data = request.get_json()

    stocks = []
    for stock_data in data:
        product_id = stock_data['product_id']
        size_id = stock_data['size_id']
        color_id = stock_data['color_id']
        quantity = stock_data['quantity']

        stock = Stock(product_id=product_id, size_id=size_id, color_id=color_id, quantity=quantity)
        stocks.append(stock)
        db.session.add(stock)

    db.session.commit()

    return jsonify(message='Stocks created successfully'), 201

@api.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
    user_id = get_jwt_identity()
    cart_items = Order.query.filter_by(user_id=user_id, status='cart').all()
    return jsonify({"cart": [item.serialize() for item in cart_items]}), 200

@api.route('/check-stock', methods=['POST'])
def check_stock():
    product_id = request.json.get('product_id')
    color_id = request.json.get('color_id')
    size_id = request.json.get('size_id')
    quantity = request.json.get('quantity')

    stock_entry = Stock.query.filter_by(
        product_id=product_id,
        color_id=color_id,
        size_id=size_id
    ).first()

    if not stock_entry:
        return jsonify(message='Stock entry not found'), 404

    if quantity > stock_entry.quantity:
        return jsonify(
            message='Quantity exceeds available stock',
            available_stock=stock_entry.quantity
        ), 400

    return jsonify(message='OK', available_stock=stock_entry.quantity), 200


@api.route('/tickets', methods=['POST'])
@jwt_required()
def create_ticket():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    subject = data.get('subject')
    description = data.get('description', '')

    if not subject:
        return jsonify({'error': 'subject required'}), 400

    ticket = SupportTicket(
        subject=subject,
        description=description,
        creator_id=user_id,
        status='open'
    )
    db.session.add(ticket)
    db.session.commit()
    return jsonify(ticket.serialize()), 201

# ---- Agregar mensaje al ticket (cliente o consultor) ----
@api.route('/tickets/<int:ticket_id>/messages', methods=['POST'])
@jwt_required()
def add_message(ticket_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    text = data.get('text')
    if not text:
        return jsonify({'error':'text required'}), 400

    ticket = SupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error':'Ticket not found'}), 404

    # Opcional: permisos (cliente puede escribir solo en sus tickets)
    user = User.query.get(user_id)
    if user.role == 'customer' and ticket.creator_id != user_id:
        return jsonify({'error':'No autorizado'}), 403

    msg = Message(ticket_id=ticket.id, sender_id=user_id, text=text)
    db.session.add(msg)
    ticket.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(msg.serialize()), 201

# ---- Obtener mensajes de un ticket ----
@api.route('/tickets/<int:ticket_id>/messages', methods=['GET'])
@jwt_required()
def get_ticket_messages(ticket_id):
    user_id = get_jwt_identity()
    ticket = SupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error':'Ticket not found'}), 404

    user = User.query.get(user_id)
    # permisos: customer ve sus tickets, consultant ve los asignados, admin ve todo
    if user.role == 'customer' and ticket.creator_id != user_id:
        return jsonify({'error':'No autorizado'}), 403
    if user.role == 'consultant' and ticket.assignee_id != user_id:
        return jsonify({'error':'No autorizado'}), 403

    messages = Message.query.filter_by(ticket_id=ticket_id).order_by(Message.created_at.asc()).all()
    return jsonify([m.serialize() for m in messages]), 200

# ---- Listar tickets (según rol) ----
@api.route('/tickets', methods=['GET'])
@jwt_required()
def list_tickets():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role == 'admin':
        tickets = SupportTicket.query.order_by(SupportTicket.updated_at.desc()).all()
    elif user.role == 'consultant':
        tickets = SupportTicket.query.filter_by(assignee_id=user_id).order_by(SupportTicket.updated_at.desc()).all()
    else:  # customer
        tickets = SupportTicket.query.filter_by(creator_id=user_id).order_by(SupportTicket.updated_at.desc()).all()
    return jsonify([t.serialize() for t in tickets]), 200

# ---- Asignar ticket (solo admin) ----
@api.route('/tickets/<int:ticket_id>/assign', methods=['POST'])
@jwt_required()
def assign_ticket(ticket_id):
    user_id = get_jwt_identity()
    admin = User.query.get(user_id)
    if admin.role != 'admin':
        return jsonify({'error':'No autorizado'}), 403

    data = request.get_json() or {}
    assignee_id = data.get('assignee_id')
    if not assignee_id:
        return jsonify({'error':'assignee_id required'}), 400

    consultant = User.query.get(assignee_id)
    if not consultant or consultant.role != 'consultant':
        return jsonify({'error':'Consultor inválido'}), 400

    ticket = SupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error':'Ticket not found'}), 404

    ticket.assignee_id = assignee_id
    ticket.status = 'pending'
    ticket.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(ticket.serialize()), 200

# ---- Cambiar estado del ticket (consultant/admin) ----
@api.route('/tickets/<int:ticket_id>/status', methods=['POST'])
@jwt_required()
def change_ticket_status(ticket_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ('open','pending','resolved','closed'):
        return jsonify({'error':'Invalid status'}), 400

    ticket = SupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({'error':'Ticket not found'}), 404

    # Admin o consultor asignado puede cambiar estado
    if user.role != 'admin' and not (user.role == 'consultant' and ticket.assignee_id == user_id):
        return jsonify({'error':'No autorizado'}), 403

    ticket.status = new_status
    ticket.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(ticket.serialize()), 200

@api.route('/create_ticket', methods=['POST'])
def create_ticket_api():
    data = request.json

    # Validar datos mínimos
    if not data.get('creator_email') or not data.get('subject'):
        return jsonify({'error': 'creator_email y subject son requeridos'}), 400

    # Buscar creator
    creator = User.query.filter_by(email=data['creator_email']).first()
    if not creator:
        return jsonify({'error': 'Creator email no encontrado'}), 404

    # Buscar assignee si existe
    assignee = None
    if data.get('assignee_email'):
        assignee_user = User.query.filter_by(email=data['assignee_email']).first()
        if not assignee_user:
            return jsonify({'error': 'Assignee email no encontrado'}), 404
        if assignee_user.role != 'consultant':
            return jsonify({'error': 'Assignee debe ser un consultor'}), 400
        assignee = assignee_user

    # Crear ticket
    ticket = SupportTicket(
        subject=data['subject'],
        description=data.get('description', ''),
        status="open",
        creator_id=creator.id,
        assignee_id=assignee.id if assignee else None,
        created_at=datetime.utcnow()
    )
    db.session.add(ticket)
    db.session.commit()

    # Crear mensaje inicial
    message = Message(
        ticket_id=ticket.id,
        sender_id=creator.id,
        text=data.get('description', ''),
        created_at=datetime.utcnow()
    )
    db.session.add(message)
    db.session.commit()

    return jsonify({"msg": "Ticket creado con éxito", "ticket_id": ticket.id}), 201

@api.route("/products/update-stock", methods=["POST"])
def update_stock():
    try:
        data = request.get_json(force=True) or {}
    except Exception as e:
        app.logger.error("Invalid JSON: %s", e)
        return jsonify({"message": "JSON inválido"}), 400

    # Validación y conversión a enteros (evita comparaciones fallidas por tipo)
    try:
        product_id = int(data.get("productId"))
        color_id = int(data.get("colorId"))
        size_id  = int(data.get("sizeId"))
        quantity = int(data.get("quantityPurchased", 0))
    except (TypeError, ValueError):
        return jsonify({"message": "productId/colorId/sizeId/quantity invalid or missing"}), 400

    if quantity <= 0:
        return jsonify({"message": "quantityPurchased debe ser mayor que 0"}), 400

    product = Product.query.filter_by(id=product_id).first()
    if not product:
        return jsonify({"message": "Producto no encontrado"}), 404

    # Buscar en la lista de stock del producto (si product.stock es lista de objetos)
    stock_item = next((s for s in product.stock if s.color_id == color_id and s.size_id == size_id), None)
    if not stock_item:
        return jsonify({"message": "Stock no encontrado"}), 404

    # Reducir stock y prevenir negativos
    original = stock_item.quantity
    stock_item.quantity = max(stock_item.quantity - quantity, 0)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error("DB commit error: %s", e)
        return jsonify({"message": "Error al actualizar DB"}), 500

    return jsonify({
        "message": "Stock actualizado",
        "product_id": product_id,
        "color_id": color_id,
        "size_id": size_id,
        "quantity_before": original,
        "quantity_after": stock_item.quantity
    }), 200
